package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"

	"github.com/ryndia/circl/dh/csidh"
)

const (
	PrivateKeySize = 37
	PublicKeySize  = 64
)

type KeyPair struct {
	DhSecret string `json:"dhSecret"`
	DhPublic string `json:"dhPublic"`
}

func main() {
	// Create key pair
	// CSIDH implementation - This is not production ready!
	secret := generateCSIDHSecretKey()
	pubK := calculateCSIDHPublicKey(secret)
	outPk := make([]byte, PublicKeySize)
	outSecret := make([]byte, PrivateKeySize)
	pubK.Export(outPk)
	secret.Export(outSecret)
	secretKey := hex.EncodeToString(outSecret)
	publicKey := hex.EncodeToString(outPk)

	keyPair := KeyPair{
		DhSecret: secretKey,
		DhPublic: publicKey,
	}

	fileData, err := json.MarshalIndent(keyPair, "", "    ")
	if err != nil {
		fmt.Println("Error marshaling JSON:", err)
		return
	}

	file, err := os.Create("keypair.json")
	if err != nil {
		fmt.Println("Error creating file:", err)
		return
	}
	defer file.Close()

	_, err = file.Write(fileData)
	if err != nil {
		fmt.Println("Error writing to file:", err)
		return
	}
}

func generateCSIDHSecretKey() *csidh.PrivateKey {
	//creating variables
	sk := new(csidh.PrivateKey)

	csidh.GeneratePrivateKey(sk, rand.Reader)

	return sk
}

func calculateCSIDHPublicKey(sk *csidh.PrivateKey) *csidh.PublicKey {

	pk := new(csidh.PublicKey)

	csidh.GeneratePublicKey(pk, sk, rand.Reader)

	// check that pk is valid
	ok := csidh.Validate(pk, rand.Reader)

	if !ok {
		return nil
	}

	return pk
}
