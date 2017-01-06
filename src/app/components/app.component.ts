import { Component } from '@angular/core';

import { HierarchyNode } from 'd3';
import { hierarchy } from 'd3-hierarchy';

const TEST_DATA = {
  name: 'taost',
  description: 'test',
  children: [
    {
      name: 'toast toatws toast',
      description: 'test test',
      children: []
    }
  ]
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent {
  title = 'Estimating';

  searchNode: HierarchyNode<any> = hierarchy(TEST_DATA);

}
