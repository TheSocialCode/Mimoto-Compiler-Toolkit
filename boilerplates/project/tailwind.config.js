/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./public/index.html", "./public/404.html", "./public/static/html/**/*.{html,js}"],
    plugins: [
        require('@tailwindcss/forms')
    ]
}
