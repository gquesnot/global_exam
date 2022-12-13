
import puppeteer from 'puppeteer-extra'
import old_puppeteer from 'puppeteer'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import {readInput, sleep} from "./helpers.js";

puppeteer.use(StealthPlugin())


export default class Global_exam {
     constructor() {


    }

    async init(){
        this.browser = await puppeteer.launch({
            headless: false,
            executablePath: old_puppeteer.executablePath()
        });
        this.page = await this.browser.newPage()
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36')
        this.navigationPromise = this.page.waitForNavigation()
    }

    async login(email, password) {
        await this.page.goto('https://auth.global-exam.com/login')
        await this.page.waitForSelector('#email')
        await this.page.type('#email', email)
        await this.page.type('#password', password)
        await this.click_selector('.card > .w-full > #login-form > .text-center > .button-solid-primary-big')
        await this.wait_navigation_and_sleep();
    }

    async select_parcours(){
        await this.click_selector('a.button-solid-primary-medium.text-size-20')
        await this.wait_navigation_and_sleep();
        this.parcours_url = this.page.url()
        await this.click_selector( 'div.ax-discardButton')
        await this.wait_navigation_and_sleep();

    }

    async get_activities() {
        this.obj_activities = {}
        let activities = await this.page.$$('button.flex.flex-col.items-center.group.col-span-4.card-hover')
        for (let i = 0; i < activities.length; i++) {
            let element = activities[i]
            let already_done = await element.$('svg.fa-check')

            if (already_done) {
                //console.log('activity already done', i)
                continue
            }
            let img_src = await (await element.$('span > img')).getProperty('src')
            img_src = await img_src.jsonValue()
            if (img_src) {
                let type = img_src.split('/').pop().split('.')[0]
                // introduction
                if (
                    type !== "reading" && type !== "listening"
                ) {
                    continue
                }
                if (!this.obj_activities.hasOwnProperty(type)) {
                    this.obj_activities[type] = []
                }
                this.obj_activities[type].push(element)
            }
        }
        this.obj_keys = Object.keys(this.obj_activities)
    }

    async select_activities_menu() {
        for (let i = 1; i < this.obj_keys.length + 1; i++) {
            let type = this.obj_keys[i - 1]
            console.log(`${i}. ${type}: ${this.obj_activities[type].length}`)
        }
        //count all values in obj_activities the sum is the total number of activities
        let total_activities = Object.values(this.obj_activities).reduce((a, b) => a + b.length, 0)
        console.log(`${this.obj_keys.length + 1}. ALL: ${total_activities}`)
        this.activity = parseInt((await readInput('Select an activity: ')))
    }

    async play_activities(){
         console.log('starting activities')
        if (this.obj_keys.length + 1 === this.activity) {
            // run all
            for (let i = 0; i < this.obj_keys.length; i++) {
                let type = this.obj_keys[i]
                await this.start_activities( type, this.obj_activities[type])
            }
        } else {
            let type = this.obj_keys[this.activity - 1]
            await this.start_activities( type, this.obj_activities[type])
        }
    }

    async start_activities(type, activities) {
        let activities_length = activities.length
        for (let i = 0; i < activities_length; i++) {
            await this.start_activity(type, activities[i])
            await this.page.goto(this.parcours_url)
            await this.wait_navigation_and_sleep();
            await this.get_activities()
            activities = this.obj_activities[type]
        }
    }

    async start_activity( type, start_element) {

        await this.page.evaluate(ele => ele.click(), start_element)
        await this.wait_navigation_and_sleep(2000);
        // check if consigne
        let consigne = await this.page.$('button.button-solid-primary-medium')
        if (consigne) {
            await this.click_selector( 'button.button-solid-primary-medium')
            await this.wait_navigation_and_sleep();
        }

        let btn_next_text = null
        let btn_next = null
        while (btn_next_text !== "Terminer") {
            if (type === "listening" || type === "reading") {
                await this.run_radios_activity()
                if (type === "reading"){
                    // select back question 1
                    await this.after_reading_activity()
                }
            }
            btn_next =  await this.page.$('button.min-w-48.button-solid-primary-large') // btn Valider | Terminer
            if (btn_next === null) {
                console.log('btn_next not found')
                await sleep(60*60*1000)
            }
            btn_next_text = await (await btn_next.getProperty('textContent')).jsonValue()
            if (btn_next_text === "Terminer") {
                break
            }
            await this.page.evaluate(ele => ele.click(), btn_next)
            await this.wait_navigation_and_sleep();
        }
        let elem_timer = await this.page.$('p.w-16.text-size-14.text-center')
        let timer = await elem_timer.getProperty('textContent')
        timer = await timer.jsonValue()
        timer = timer.split(':')
        let seconds_passed = parseInt(timer[1]) * 60 + parseInt(timer[2])
        let sleeping_s = 19 * 60 - seconds_passed
        console.log(`sleeping ${sleeping_s}s`)
        await sleep(sleeping_s * 1000)
        await this.page.evaluate(ele => ele.click(), btn_next)

    }

    async run_radios_activity() {
        let radios = await this.page.$$('input[type="radio"]')
        let names = [];
        for (let i = radios.length - 1; i > 0; i--) {
            let name = await (await radios[i].getProperty('name')).jsonValue()
            if (!names.includes(name)) {
                await this.page.evaluate(ele => ele.click(), radios[i])
                names.push(name)
                await sleep(500)
            }
        }
        await sleep(1000)
    }

    async after_reading_activity() {

        let btn_next =  await this.page.$('button.min-w-48.button-solid-primary-large')
        while (btn_next === null) {
           let btn_chevron_next = await this.get_reading_svg_next()
            console.info('btn_chevron_next', btn_chevron_next)
            await this.click_element(btn_chevron_next)
            await sleep(750)
            btn_next =  await this.page.$('button.min-w-48.button-solid-primary-large')
            console.info('btn_next', btn_next)

        }
    }

    async  get_reading_svg_next(){
        return await this.page.$('button > svg[data-icon=chevron-next]')
    }


    async wait_navigation_and_sleep(ms=1500) {
        await this.navigationPromise
        await sleep(ms)
    }

    async stop(){
        await this.browser.close()
    }

    async click_selector(selector) {
        await this.page.waitForSelector(selector)
        await this.page.evaluate(ele => ele.click(), (await this.page.$(selector)))
    }

    async click_element(element) {
        await this.page.evaluate(ele => ele.click(), element)
    }



}