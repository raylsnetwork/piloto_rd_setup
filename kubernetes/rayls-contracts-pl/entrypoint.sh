#!/bin/bash

npx hardhat compile && \
npx hardhat deploy:privacy-ledger --private-ledger PL --network custom_pl