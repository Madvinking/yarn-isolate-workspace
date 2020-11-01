module.exports = {
  exclude: /node_modules/,
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'usage',
        corejs: { version: 3, proposals: true },
        targets: {
          node: '10.15.2',
        },
      },
    ],
  ],
  plugins: ['@babel/plugin-proposal-class-properties'],
};
