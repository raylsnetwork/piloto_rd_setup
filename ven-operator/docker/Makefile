.PHONY: help deploy-commit-chain-contract add-participant

help:
	@echo "deploy-commit-chain-contract - Deploy Commit Chain contract in the Commit Chain. Example: make deploy-commit-chain-contract"
	@echo "add-participant              - Add participant in the Commit Chain. Example: make add-participant"
	@echo "down-all                     - Stop the docker compose and remove orphans. Example: make down-all"

deploy-commit-chain-contract:
	@docker compose up deploy-commit-chain-contract | tee output.txt
	@sed 's/deploy-commit-chain-contract-1  | //g' output.txt | sed -r "s/\x1b\[[0-9;]*[a-zA-Z]//g" | sed 's/[-\\|\/]//g' | sed 's/\x1b\[\?25[lh]//g' > commit-chain-contract.txt
	@rm output.txt
add-participant:
	@docker compose up add-participant

down-all:
	@docker compose down --remove-orphans
