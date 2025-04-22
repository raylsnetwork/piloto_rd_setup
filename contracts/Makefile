setup-env:
	@echo "Setting up environment..."
	@echo "Installing dependencies..."
	@npm install
	@echo "Installing hardhat..."
	@npm install --save-dev hardhat
	@echo "Compiling contracts..."
	@npx hardhat compile
	@echo "Installing Foundry..."
	@curl -L https://foundry.paradigm.xyz | bash
	@echo "Installing Foundry dependencies..."
	@foundryup

deploy-privacy-ledger:
	@echo "Deploying privacy-ledger..."
	@npx hardhat deploy:privacy-ledger --private-ledger PL --network custom_pl