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
