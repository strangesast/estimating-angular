import { Injectable } from '@angular/core';

@Injectable()
export class DragService {

  constructor() { }

  handle(evt) {
    console.log('drag event', evt);
  }

}
