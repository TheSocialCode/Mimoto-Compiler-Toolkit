class Utils {
    static async getInquirer() {
      if (!Utils._inquirer) {
        const inquirerModule = await import('inquirer');
        Utils._inquirer = inquirerModule.default;
      }
      return Utils._inquirer;
    }

    static handleError(error)
    {
      if (error.name === 'ExitPromptError')
        {
        console.log('Prompt was forcefully closed by the user.');
        process.exit(0);
      } else {
        console.error("Error during prompting:", error);
      }
    }
  }
  
  module.exports = Utils;