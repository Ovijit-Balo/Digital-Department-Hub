module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  extends: ["eslint:recommended", "plugin:import/recommended", "prettier"],
  parserOptions: {
    ecmaVersion: "latest"
  },
  rules: {
    "import/no-unresolved": "off",
    "no-console": "off",
    "no-unused-vars": ["error", { "argsIgnorePattern": "next" }]
  }
};
