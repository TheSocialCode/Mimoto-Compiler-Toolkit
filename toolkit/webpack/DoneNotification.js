/**
 * Mimoto - The Social Code
 *
 * @author Sebastian Kersten (@supertaboo)
 */


const DataUtils = require('./../utils/DataUtils');


class DoneNotification
{
    apply(compiler) {
        compiler.hooks.done.tap(
            'DoneNotification',
            (
                stats /* stats is passed as an argument when done hook is tapped.  */
            ) => {

                // 1. read
                let end = new Date();

                // 2. compose
                const sTimestampDone = end.getFullYear() + '.' + DataUtils.addLeadingZeros(end.getMonth() + 1, 2) + '.' + DataUtils.addLeadingZeros(end.getDate(), 2) + ' ' + DataUtils.addLeadingZeros(end.getHours(), 2) + ':' + DataUtils.addLeadingZeros(end.getMinutes(), 2) + ':' + DataUtils.addLeadingZeros(end.getSeconds(), 2);

                // 3. output
                setTimeout(
                    () => {
                        console.log(
                            '\n---------------------------------------\n' +
                            '❤️ - Compile done! - \u001b[1m' + sTimestampDone + '\u001b[22m\n'
                        );
                    },
                    100
                );
            }
        );
    }
}

module.exports = DoneNotification;