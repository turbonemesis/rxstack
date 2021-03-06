import {ServiceRegistry} from '@rxstack/service-registry';
import {AbstractFixture} from './abstract-fixture';
import {Injectable} from 'injection-js';
import {PurgerInterface} from './interfaces';

const winston = require('winston');

@Injectable()
export class FixtureManager extends ServiceRegistry<AbstractFixture> {

  constructor(registry: AbstractFixture[], private purger: PurgerInterface) {
    super(registry);
  }

  async execute(purge = false): Promise<void> {
    if (purge) {
      await this.purger.purge();
    }
    const fixtures = this.getOrderedFixtures();
    for (let i = 0; i < fixtures.length; i++) {
      winston.debug(`Loading fixture "${fixtures[i].getName()}"`);
      await fixtures[i].load();
    }
  }

  getOrderedFixtures(): AbstractFixture[] {
    return this.all().sort((a: AbstractFixture , b: AbstractFixture) => a.getOrder() - b.getOrder());
  }
}