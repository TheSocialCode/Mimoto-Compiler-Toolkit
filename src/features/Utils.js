class Utils {
    static async getInquirer() {
      if (!Utils._inquirer) {
        const inquirerModule = await import('inquirer');
        Utils._inquirer = inquirerModule.default;
      }
      return Utils._inquirer;
    }
  }
  
  module.exports = Utils;