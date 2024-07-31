# Puddleshine

A _Warriors_-themed Discord bot.

This bot is still very much in development. Currently, the only supported feature is Catcha, a Warrior Cats gacha card collector game. Other features are planned or are currently in development.

This bot is written in TypeScript by following Discord's [tutorial](https://discord.com/developers/docs/tutorials/hosting-on-cloudflare-workers) on how to host a bot on Cloudflare Workers. It uses Cloudflare's built-in D1 and KV as the databases with Prisma being used as the ORM.

## Why?

Most Warriors-related Discord servers (or at least the ones I'm on) have a bot called [Littlecloud](https://littlecloudbot.net) that includes fun games like Gatcha, nursery, and apprentices. However, Littlecloud hasn't been updated since early 2023 and all attempts to contact its creator, Chratis, have thus far seemed futile with no response or an initial response after multiple attempts followed by silence. Several new Warriors books are released every year and Littlecloud has already fallen behind in terms of Gatcha cards and warrior names. Furthermore, Littlecloud has some annoying bugs and issues that nobody is there to address.

Therefore I've decided to write an open-source reimplementation of the bot and add all of the updates myself.

I chose to build the bot as a serverless Worker because I figured it'd be cheaper to host serverless code somewhere than rent a traditional VPS and use something like Discord.js. After all, it's a silly Warriors bot and I don't want to spend all of my money on it.

## Set up

Here's a step-by-step guide on how to set up your environment and get the bot up and running.

1. Create a Discord bot in the [Discord developer portal](https://discord.com/developers) or use and existing one. You'll need the bot token, application ID, and the public key.
2. Create a Cloudflare account or use your existing one. Log into [dash.cloudflare.com](https://dash.cloudflare.com/) and create a new Worker, a new D1 database, and a new KV namespace. Add `DISCORD_TOKEN` and `DISCORD_PUBLIC_KEY` to your Worker as environment variables. Don't forget to encrypt them.
3. Add your own Discord account ID to the KV namespace with the key `BotSuperAdminDiscordId`. This will allow you to use admin commands.
4. You'll also need something like an R2 bucket, for example, to store the Catcha art. The `upload-art` script will use rclone to upload the contents of `./resources/catcha-art` to `puddleshine:puddleshine/catcha-art`. The `rc` (resource compiler) script will then substitute the environment variable `ART_URL_BASE` into the cards such that the art URLs will look something like `https://r2.puddleshine.bristlefrost.net/catcha-art/0117-bristlefrost/bristlefrost-ursiday.png`.
5. Create a file named `.env` in the project root directory to store your environment variables. It should look like this + your environment variables of course.

```conf
CLOUDFLARE_ACCOUNT_ID=
WORKER_NAME=
D1_DB_NAME=
D1_DB_ID=
KV_ID=

DISCORD_TOKEN=
DISCORD_APPLICATION_ID=
DISCORD_PUBLIC_KEY=

# Art
ART_URL_BASE=
```

6. Run `yarn install` (I use yarn as my package manager but you can use npm too).
7. Run `WRANGLER_TOML=1 yarn deploy` to generate the `wrangler.toml` file.
8. Generate the Prisma client with `yarn prisma generate` and follow [this guide](https://developers.cloudflare.com/d1/tutorials/d1-and-prisma-orm/#4-create-a-table-in-the-database) on how to apply the migrations from `./prisma/schema.prisma` to your D1 database.
9. Create a Discord server that will act as the bot's admin server. Admin commands will be registered only to that server to prevent regular users from messing with them. Create `./resources/admin-servers.json` with the content `[YOUR_ADMIN_SERVER_ID]` (basically just surround the ID copied from Discord in square brackets).
10. Upload the Catcha art from `./resources/catcha-art` somewhere and set `ART_URL_BASE=` in your `.env` to the URL of the uploaded `catcha-art` directory.
11. Compile all of the resources like cards with `yarn rc` and build the source code with `yarn build`.
12. Deploy to Cloudflare workers using `yarn deploy`.
13. Go back to the Discord developer portal for your bot and set the interactions endpoint URL to the URL of the Worker.

## Contributions

Why not? Just make sure that your code is formatted correctly by doing `yarn check`. However, if you'd like to add something big like a new command, please discuss it first on the [Puddleshine Discord server](https://discord.gg/vnEP4p3qCU).
