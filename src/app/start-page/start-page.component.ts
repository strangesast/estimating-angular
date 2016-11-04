import { Component, OnInit } from '@angular/core';

import { ElementService } from '../element.service';

@Component({
  selector: 'app-start-page',
  templateUrl: './start-page.component.html',
  styleUrls: ['./start-page.component.less']
})
export class StartPageComponent implements OnInit {

  constructor(private elementService: ElementService) { }

  ngOnInit() {
  }

}
