import sys
import os
import webapp2
#sys.path[0:0] = ['~/BeepBox/']

import Crypto
from Crypto.Hash import SHA256
from Crypto.PublicKey import RSA
from Crypto import Random

privateKeyString = """-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAqoaWIECUkcFoAcQjKkWtPpBEy3yrDBjTUldOWU3ejvMxBTeo
SNiRHMYwk+q6eo40hm+KW+G3PtcWJnb9Gra1C2TBwm3Rdld9Otl0hhqakmV92U/l
WF4oQwpZd+rIDLHKWfMdym6GORg99yFoufOl/nXYwgles+c9+yqtVAJ4FOnUN7Ou
B3wA02Tk+zJcToMej8FARkNPBJT/ckRHFgl2bcoXnvvA99FEhpq0uha3AMlCl5O8
1mWI+myVk9sCmRMV1lWUO9swA5Qd3SXlseNB12AfVpzrBAjYL6IkPynB9FOySI2W
8IovOXTaBZ1OCCbUH2m912DI3wQQxDPmElOnXQIDAQABAoIBAFQFOkUr7MggVoHA
RV9Xs3PHG85zX8f3F3BTyivgXU9r7fRXJxi1dFKMKHVJS5aFKMYwgSiif2p8CdLr
/+vAqFWz0HBfMbywgOiVKn/E7fJCBY8kealfw1C88bZPPUBb/YryafRLHuFU23s/
v90Xeut031dDzKCxyG1P6tUg3k/W0xyiV9SMkyhgOXVldh5p7OvGFhtQGQV7g6pL
hEFoZBe34VDFgZV02njL1fVUtD7vp5TFHVlX3KruVQhURQ6rfff6mByUZFHhfrcD
Jg+pa7w18JgztHHSOYPRasn0EwttMDAygUr0bqJ45NzJ83GRC3FIsPoakY7mLlb3
NkQrrpUCgYEAuKebUd1oN9G2cAhrHmAKYef+NZqK8UhRrr7JB6X44IWp4IWfhKNo
S+UQys8BiLZ6w/H2HkUNLqXvA4URxCe9iRIMUy6XxX14XB/RqQ57SDleLJb4+2XU
z3ccfXMU7cHS+LxsSx//g2+Q1+RC39SfNOEahoeIYnlP21QqAAExkacCgYEA7Gl3
f8cByIHrlRE64deLNNAjflf76MU5pFudccXKwrLTpbI0LFLWO/MbRBK3jjyTht1k
E+WqJyQlaZq2FEA5cLzkk7DgHrD32Ln6BEfDf+UjrNLGpa2cG+PfVct63G4uqH3M
gNlBsqu6jPdeWFL3zUUsh4cvicyyir+phG6GN1sCgYEAg2/CTgZUXY8n1h0X6log
acpRl2Q2zEJW6hShUZFhUqex4MAcaLRL0+HsDwBELkT9o6YCM0+hb3frZsz8dWx4
LC4tmbQLkiaaWrDHcxd8x08WapTYC1JTpY06OU2GMyqI+kZcqyjOnob2ScYPl/Vn
kaM9V0731GhXYF5LOw+ecfcCgYB0BZJ66Ays/W3DW5BdM64Cvj8dC0r6wof2bGvJ
YTuP77lE8T7/nau8AiQYdWMV8A6quk4aIbUuvmOJ/z5qk9ZcyKcZAE4NYeZQu3zC
ywFb6/VlJJAO0TPy0BNUBKeINJ67W/mYJodCi1rjQadQi29HkzI2VRb0drwMseEc
uC0wTwKBgGEfrG+2nBC+b+28CN1SJtVHqicBEw+xfw0qf2gxJgDXy3idgIBHMcYp
pKiuZPLxVzYTXEJ6HkamkI6eb7+wiOnS/wYf6tq5zqtQv9DbEvXj45uziuQOMxeu
OSo28rNhxCoXCwjE1jKBQQ/lgrz//8i0bFr6VdUMuCHm2OqTSwke
-----END RSA PRIVATE KEY-----"""

publicKeyString = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqoaWIECUkcFoAcQjKkWt
PpBEy3yrDBjTUldOWU3ejvMxBTeoSNiRHMYwk+q6eo40hm+KW+G3PtcWJnb9Gra1
C2TBwm3Rdld9Otl0hhqakmV92U/lWF4oQwpZd+rIDLHKWfMdym6GORg99yFoufOl
/nXYwgles+c9+yqtVAJ4FOnUN7OuB3wA02Tk+zJcToMej8FARkNPBJT/ckRHFgl2
bcoXnvvA99FEhpq0uha3AMlCl5O81mWI+myVk9sCmRMV1lWUO9swA5Qd3SXlseNB
12AfVpzrBAjYL6IkPynB9FOySI2W8IovOXTaBZ1OCCbUH2m912DI3wQQxDPmElOn
XQIDAQAB
-----END PUBLIC KEY-----"""

hashLength = 32 # in bytes, SHA256 output 256 bits == 32 bytes
signatureLength = 256 # in bytes, 2048 bit RSA mean 256 bytes

def testKeyGeneration(self):
	message = "The rain in Spain falls mainly on the Plain"
	
	sha = SHA256.new(message)
	hash = sha.digest()
	#self.response.out.write(repr(hash))
	#self.response.out.write("\n");
	#self.response.out.write(sha.hexdigest())
	#self.response.out.write("\n");
	
	#key = RSA.generate(2048, os.urandom)
	#self.response.out.write(key.exportKey())
	#self.response.out.write("\n");
	#self.response.out.write(key.publickey().exportKey())
	
	key = RSA.importKey(privateKeyString)
	#self.response.out.write("n: " + hex(key.n)[2:-1])
	#self.response.out.write("\n");
	#self.response.out.write("e: " + hex(key.e)[2:-1])
	#self.response.out.write("\n");
	
	padded = "\x00" + hash;
	while len(padded) < signatureLength - 2:
		padded = "\xff" + padded;
	padded = "\x00\x01" + padded;
	
	#self.response.out.write(repr(padded));
	#self.response.out.write("\n");
	
	# You sign the hash
	(signed,) = key.sign(padded,"")
	self.response.out.write(hex(signed)[2:-1]) # skip prefix and suffix: 0x...L


class AuthenticateSong(webapp2.RequestHandler):
	def post(self):
		self.response.headers['Content-Type'] = 'text/plain'
		self.response.out.write(self.request.get("name"))
		#self.response.out.write(self.request.arguments())
		#testKeyGeneration(self)
		


#app = webapp2.WSGIApplication([('/authenticate_song', AuthenticateSong)], debug=True)
app = webapp2.WSGIApplication([('/authenticate_song', AuthenticateSong)])
