import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                process: 'readonly',
                console: 'readonly'
            },
        },
        rules: {
            semi: ['off'],
        },
    },
];
