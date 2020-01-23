import {Injectable} from 'injection-js';
import {SecretLoader} from './secret-loader';
import {JWTDecodeFailureException, JWTEncodeFailureException} from '../exceptions';
import {KeyType, Secret, TokenManagerInterface} from '../interfaces';
import {SecurityConfiguration} from '../security-configuration';
import {ServiceRegistry} from '@rxstack/service-registry';
const jwt = require('jsonwebtoken');

@Injectable()
export class TokenManager implements TokenManagerInterface {

  constructor(private secretManager: ServiceRegistry<SecretLoader>, private config: SecurityConfiguration) { }

  async encode(payload: Object): Promise<string> {
    const iss = (typeof payload === 'object' && payload['iss']) ? payload['iss'] : this.config.default_issuer;
    const secretLoader = this.secretManager.get(iss);
    const key = await secretLoader.loadKey(KeyType.PRIVATE_KEY);
    let secretOrPrivateKey: Secret|string;

    if (typeof key === 'string') {
      secretOrPrivateKey = key;
    } else {
      secretOrPrivateKey = { key: key, passphrase: secretLoader.config.secret['passphrase'] };
    }

    try {
      return jwt.sign(payload, secretOrPrivateKey, {
        algorithm: secretLoader.config.signature_algorithm,
        expiresIn: this.config.ttl,
        issuer: secretLoader.config.issuer
      });
    } catch (e) {
      throw new JWTEncodeFailureException(
        'An error occured while trying to encode the JWT token. ' +
        'Please verify your configuration (private key/passphrase)',
        e.message);
    }
  }

  async decode(token: string): Promise<Object> {
    let iss: string;
    try {
      const decoded = jwt.decode(token, {json: true, complete: true});
      iss = decoded.payload['iss'] ? decoded.payload['iss'] : this.config.default_issuer;
    } catch (e) {
      throw new JWTDecodeFailureException('Invalid JWT Token', e.message);
    }

    const secretLoader = this.secretManager.get(iss);
    const loadedPublicKey = await secretLoader.loadKey(KeyType.PUBLIC_KEY);
    let options: Object = {
      algorithms: [secretLoader.config.signature_algorithm],
      issuer: secretLoader.config.issuer
    };

    try {
      return  jwt.verify(token, loadedPublicKey, options);
    } catch (e) {
      throw new JWTDecodeFailureException('Invalid JWT Token', e.message);
    }
  }
}