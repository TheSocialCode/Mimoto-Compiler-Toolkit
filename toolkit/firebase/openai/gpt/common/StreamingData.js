/**
 * Mimoto Firebase Toolkit - GPT - Conversation GPT - A tiny communication focused layer on top of OpenAI's GPT
 * @author - Sebastian Kersten (sebastian@thesocialcode.com)
 */


// import Mimoto classes
const EventDispatcher = require("../../../utils/EventDispatcher");


class StreamingData extends EventDispatcher {

    DATA = 'data';
    DONE = 'done';
    ERROR = 'error';


    _sFullData = '';


    getFullData() {
        return this._sFullData;
    }

    constructor()
    {
        super();
    }

    data(sChunk) {

        this._sFullData += sChunk

        let event = new Event(this.DATA);
        event.data = sChunk;

        this.dispatchEvent(event);
    }

    done() {

        this.dispatchEvent(new Event(this.DONE));
    }

    error(err) {

        let event = new Event(this.ERROR);
        event.data = err;

        this.dispatchEvent(event);
    }
}

module.exports = StreamingData;