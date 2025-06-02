Deploy Token

npx hardhat deployErc20BatchToken --pl A --name "Batch Token Daily" --symbol BTKY

0x7cd332d19b93bcabe3cce7ca0c18a052f57e5fd03b4758a09f30f5ddc4b22ec4

Approve Token

npx hardhat approveLastToken

Check Balance

npx hardhat getErc20BatchTokenBalance --pl A --address 0xf9260C378ea6E428A79EAfe443BD24EA09Af8Bc9 --resource-id 0x7cd332d19b93bcabe3cce7ca0c18a052f57e5fd03b4758a09f30f5ddc4b22ec4

Mint

npx hardhat mintErc20BatchToken --amount 1000 --pl A --address 0xf9260C378ea6E428A79EAfe443BD24EA09Af8Bc9 --resource-id 0x7cd332d19b93bcabe3cce7ca0c18a052f57e5fd03b4758a09f30f5ddc4b22ec4

Batch Transfer

0xfaAF1Cbca846d10efCe8A9Ac28483db7D5624f9c
0x2906c1834DB2848e3C766f0F17Fa1E6EAC7009ef

npx hardhat batchTransferErc20BatchToken B 0xfaAF1Cbca846d10efCe8A9Ac28483db7D5624f9c 100 B 0x2906c1834DB2848e3C766f0F17Fa1E6EAC7009ef 200 --pl A --address 0xf9260C378ea6E428A79EAfe443BD24EA09Af8Bc9 --resource-id 0x7cd332d19b93bcabe3cce7ca0c18a052f57e5fd03b4758a09f30f5ddc4b22ec4

Check Balances

npx hardhat getErc20BatchTokenBalance --pl A --address 0xf9260C378ea6E428A79EAfe443BD24EA09Af8Bc9 --resource-id 0x7cd332d19b93bcabe3cce7ca0c18a052f57e5fd03b4758a09f30f5ddc4b22ec4
npx hardhat getErc20BatchTokenBalance --pl B --address 0xfaAF1Cbca846d10efCe8A9Ac28483db7D5624f9c --resource-id 0x7cd332d19b93bcabe3cce7ca0c18a052f57e5fd03b4758a09f30f5ddc4b22ec4
npx hardhat getErc20BatchTokenBalance --pl B --address 0x2906c1834DB2848e3C766f0F17Fa1E6EAC7009ef --resource-id 0x7cd332d19b93bcabe3cce7ca0c18a052f57e5fd03b4758a09f30f5ddc4b22ec4

---

Batch Transfer Arbitrary Messages

npx hardhat batchTransferArbitraryMessages "Putting" "the" "world" "in" "blockchain" "rayls"

Check Messages

npx hardhat getMessages --pl B --address 0xE7a79a46D9E1EE897a75c1207d0d4335c457E3Fc