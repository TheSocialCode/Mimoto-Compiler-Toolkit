# Mimoto Compiler Toolkit
A tiny helper for building Mimoto projects

# Install
```
npm install mimoto
```

# Config
Place a config file named **mimoto.config.json** in the root of your project
```
{
    // combine multiple .html files into one file
    "combine": {
        "sources": [
            "src"
        ],
        "output": "output/CombinedTemplates.html"
    }
}
```

# Run
```
npx mimoto
```

# During development
In the root of the project, run:
``` 
node cli.js -root example
```


# Mimoto-Firebase-Toolkit

This package includes frequently used [Mimoto](https://thesocialcode.com/mimoto) modules for rapid app creation with [Firebase](https://firebase.google.com/).

## In this package

- Mailer - A tiny and handy wrapper around the Firebase extension [Trigger Email from Firestore](https://extensions.dev/extensions/firebase/firestore-send-email).
- conversationGPT - A tiny communication focused layer on top of OpenAI's [GPT](https://platform.openai.com/docs/guides/gpt).

For more information on how to use these components, see [Mimoto Firebase Toolkit - Modules](https://github.com/TheSocialCode/Mimoto-Firebase-Toolkit/wiki/Modules)
