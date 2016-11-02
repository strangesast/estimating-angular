import { Injectable } from '@angular/core';

import * as jsgitModes      from 'js-git/lib/modes';
import * as jsgitMemDb      from 'js-git/mixins/mem-db';
import * as jsgitCreateTree from 'js-git/mixins/create-tree';
import * as jsgitPackOps    from 'js-git/mixins/pack-ops';
import * as jsgitWalkers    from 'js-git/mixins/walkers';
import * as jsgitCombiner   from 'js-git/mixins/read-combiner';
import * as jsgitFormats    from 'js-git/mixins/formats';

@Injectable()
export class ElementService {

  constructor() { }

  init():void {

  }

}
