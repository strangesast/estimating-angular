import { 
  EventEmitter,
  OnChanges,
  Component,
  OnInit,
  Output,
  Input
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Subscription, BehaviorSubject } from 'rxjs';

// for use in edit page in '.main' and on build / elsewhere in lower window

import { ComponentElement, Child, FolderElement } from '../../models/classes';

@Component({
  selector: 'app-edit-window',
  templateUrl: './edit-window.component.html',
  styleUrls: ['./edit-window.component.less'],
  host: {
    '[class.isWindow]': 'isWindow'
  }
})
export class EditWindowComponent implements OnInit, OnChanges {
  @Input() config: any;
  @Input() element: BehaviorSubject<ComponentElement|FolderElement|Child|null>;
  public _element: ComponentElement|FolderElement|Child|null;
  public type: string = 'unknown';
  @Output() close = new EventEmitter();
  private form: FormGroup;
  
  private elementSub: Subscription;

  @Input() isWindow: boolean = false;

  constructor(private formBuilder: FormBuilder) { }

  ngOnInit() {
    if(this.element) this.initElement(this.element);
  }

  initElement(element) {
    this.elementSub = element.subscribe(_element => {
      this._element = _element;
      this.type = _element instanceof FolderElement ? _element.type : _element instanceof ComponentElement ? 'component' : _element instanceof Child ? 'child' : 'unknown';
    });
  }

  ngOnChanges(changes) {
    if('element' in changes) {
      this.initElement(this.element)
    }
  }

  toggleOpen() {
    this.config.open = !this.config.open;
  }

  onClose() {
    this.close.emit();
  }
}
