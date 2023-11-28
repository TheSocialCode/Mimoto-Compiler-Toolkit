/**
 * Mimoto - The Social Code
 *
 * @author Sebastian Kersten (@supertaboo)
 */

class DoneNotification
{
    apply(compiler) {
        compiler.hooks.done.tap(
            'DoneNotification',
            (
                stats /* stats is passed as an argument when done hook is tapped.  */
            ) => {
                setTimeout(
                    () => {
                        console.log(
                            '\n-------------------------------------------------------------------------------------\n' +
                            '❤️  - Compile done! - ' + new Date().toString() + '\n'
                        );
                    },
                    100
                );
            }
        );
    }
}

module.exports = DoneNotification;