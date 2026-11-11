# EFF passphrase wordlists

The JSON files in this directory are derived from the Electronic Frontier Foundation's published wordlists:

- `eff-large.json`: [EFF Large Wordlist](https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt), 7,776 words.
- `eff-short.json`: [EFF Short Wordlist, version 1](https://www.eff.org/files/2016/09/08/eff_short_wordlist_1.txt), 1,296 words.

The numeric dice prefixes in the source files are removed; the word order and spelling are preserved. Duplicate checks and counts are covered by `src/services/__tests__/crypto.test.ts`.

The EFF wordlists are attributed to the Electronic Frontier Foundation under CC BY 3.0 US. See the EFF's [copyright page](https://www.eff.org/copyright) and [Dice-Generated Passphrases](https://www.eff.org/dice) for the original publication and licensing.

These lists are used for passphrase generation. They are not automatically added to zxcvbn's analysis dictionaries.
