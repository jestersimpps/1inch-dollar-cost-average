# 1inch-dollar-cost-average


A quick something I put together to dollar cost average a DEX wallet on polygon.
1inch exchange trade bot that buys the dips once per hour/day/week

# configuring the app

## install dependencies

`yarn` or `npm i`

## configure pairs, interval and timeframe

copy the `.env-example` and rename it to `.env`, adjust the values.

```
PUBLIC_KEY = 
PRIVATE_KEY = 

TELEGRAM_BOT_TOKEN = 
TELEGRAM_CHAT_ID = 

INCH_KEY = 

```

## hook it up to your wallet

copy the `.env-example` and rename it to `.env`, adjust the values.

`REFRESH_INTERVAL` in the constants file is the interval the bot updates prices/trades in milliseconds. The example is set to 1 minute

you can extract your public and private keys from your metamask browser extention.

\*\*Also be sure to approve the allowances in the 1inch app first, I still need to add a piece of code that approves the allowances in the bot.

# compiling and running the app

## compilation

be sure you have typescript installed

`tsc`

## running after compilation

`node dist/main` or `npm start`
