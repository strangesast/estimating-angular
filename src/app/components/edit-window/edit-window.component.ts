import { 
  EventEmitter,
  OnChanges,
  Component,
  OnInit,
  Output,
  Input
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Observable, Subscription, BehaviorSubject } from 'rxjs';

import { ElementService } from '../../services/element.service';
import { ComponentElement, ChildElement, FolderElement } from '../../models';

// for use in edit page in '.main' and on build / elsewhere in lower window

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
  @Input() element: BehaviorSubject<ComponentElement|FolderElement|ChildElement|null>;
  public _element: ComponentElement|FolderElement|ChildElement|null;
  public type: string = 'unknown';
  @Output() close = new EventEmitter();


  private form: FormGroup;
  
  private elementSub: Subscription;

  @Input() isWindow: boolean = false;

  constructor(private elementService: ElementService, private formBuilder: FormBuilder) { }

  ngOnInit() {
    let el = this.element;

    if(el) this.initElement(el);

    let val:any = el ? el.getValue() : {};

    if(val && val instanceof ChildElement) {
      this.form = this.formBuilder.group({
        name: [ val.name || '' ],
        description: val.description || '',
        qty: [ val.qty || null ]
      });

    } else {
      this.form = this.formBuilder.group({
        name: [ val.name || '' ],
        description: val.description || ''
      });

    }
  }

  initElement(element) {
    this.elementSub = element.switchMap(_element => {
      if (_element instanceof ChildElement) {
        return Observable.fromPromise(this.elementService.retrieveElement(ComponentElement, _element.ref).then((data: ComponentElement) => {
          _element.data = data;
          return _element;
        }));
      } else {
        return Observable.of(_element)
      }
    }).subscribe(_element => {
      this._element = _element;
      this.type = _element instanceof FolderElement ? _element.type : _element instanceof ComponentElement ? 'component' : _element instanceof ChildElement ? 'child' : 'unknown';
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

  onSubmit({ dirty, value, valid }: { dirty: boolean, value: any, valid: boolean}) {
    if(dirty && valid) {
      let current = this.element.getValue();
      this.element.next(Object.assign(current, value));
      this.form.markAsPristine();

    } else if (!valid) {
      alert('invalid');
    }
  }

  reset() {
    this.form.reset();
    this.form.patchValue(this.element.getValue());
  }

}
