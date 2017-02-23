import { Input, Component, OnInit } from '@angular/core';

export const ExampleComponentSelector = 'app-example-component';

@Component({
  selector: ExampleComponentSelector,
  templateUrl: './example-component.component.html',
  styleUrls: ['./example-component.component.less']
})
export class ExampleComponent implements OnInit {
  @Input() data;

  constructor() { }

  ngOnInit() {
    console.log('data', this.data);
  }

}
