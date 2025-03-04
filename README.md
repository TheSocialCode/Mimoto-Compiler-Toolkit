# Mimoto - Compiler & Toolkit
A tiny helper for building Mimoto projects

# Install
```
npm install mimoto
```

# Run

**1. Start Firebase Emulators:**
```
firebase emulators:start
```

**2. Start Webpack:**
```
npx webpack
```

**3. Start Tailwind:**
```
npx tailwindcss -i ./src/css/TabTap.src.css -o ./public/static/css/TabTap.css --watch
```
        
✨ and finally,

**4. Start Mimoto:**
```
npx mimoto run
```

This set utils compiles your js & css, and combines your Mimoto html template files.  


# Utility functions
Watch and auto-clone a file:
``` 
npx mimoto clone <file_to_watch> <clone_destination>
```


# Mimoto-Firebase-Toolkit

This package includes frequently used [Mimoto](https://thesocialcode.com/mimoto) modules for rapid app creation with [Firebase](https://firebase.google.com/).

## In this package

- Mailer - A tiny and handy wrapper around the Firebase extension [Trigger Email from Firestore](https://extensions.dev/extensions/firebase/firestore-send-email).
- ConversationGPT - A tiny communication focused layer on top of OpenAI's [GPT](https://platform.openai.com/docs/guides/gpt).

For more information on how to use these components, see [Mimoto Firebase Toolkit - Modules](https://github.com/TheSocialCode/Mimoto-Firebase-Toolkit/wiki/Modules)

# Future features
- Auto remove comments from HTML files

# During development
```
node cli.js
````