// add stealth plugin and use defaults (all evasion techniques)
import Global_exam from './src/global_exam.js'


(async () => {
        //const username = await readInput("Username: ")
        //const password = await readInput("Password: ")
        const email = 'YOUR_EMAIL';
        const password = 'YOUR_PWD';
        let global_exam = new Global_exam()
        await global_exam.init()
        await global_exam.login(email, password)
        await global_exam.select_parcours()
        await global_exam.get_activities()
        await global_exam.select_activities_menu()
        await global_exam.play_activities()
        await global_exam.stop()
    }
)
();

