
## Arb-Monitor 🔵 👀

### Set Up Env Variables

Set up env vars in `.env.sample.` Can use .env.sample as-is for mainnet:

```
cp .env.sample .env
```

(Note that `PRIVKEY` is only required for wallet instantiation - no chain writing occurs; a throwaway key can/should be used. Key in .env.sample is public / in testnet docs and so can be used).

### Install

```
yarn install
```

### Run

```
yarn deposits
```