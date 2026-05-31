module.exports = {
  PORT:              process.env.PORT              || 3001,
  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  NODE_ENV:          process.env.NODE_ENV          || 'development',
};
