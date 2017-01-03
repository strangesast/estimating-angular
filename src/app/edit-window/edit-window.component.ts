import { 
  Input,
  Component,
  OnChanges,
  OnInit,
  SimpleChanges,
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// for use in edit page in '.main' and on build / elsewhere in lower window

import { ComponentElement, Child, FolderElement } from '../classes';

@Component({
  selector: 'app-edit-window',
  templateUrl: './edit-window.component.html',
  styleUrls: ['./edit-window.component.less'],
  animations: [
    trigger('myAnimation', [
      state('in', style({ opacity: 1, transform: 'translateX(0px)' })),
      state('out', style({ opacity: 0})),
      transition(':enter', [
        style({
          opacity: 0,
          transform: 'translateX(-100%)'
        }),
        animate('100ms ease-in')
      ]),
      transition(':leave', [
        animate('100ms ease-out', style({
          opacity: 0,
          transform: 'translateX(100%)'
        }))
      ]),
      transition('in => out', animate(100, style({transform: 'translateX(100%)'}))),
      transition('out => in', animate(100, style({transform: 'translateX(-100%)'})))
    ])
  ]
})
export class EditWindowComponent implements OnInit, OnChanges {
  @Input() active: boolean = false;
  @Input() element: ComponentElement|FolderElement|Child|null;
  private isNew: boolean = true;
  private kind: string;
  private form: FormGroup

  constructor(private formBuilder: FormBuilder) { }

  ngOnInit() {
    let el = this.element;
    if(el != null) {
      this.isNew = false;
      this.kind = this.whichKind(el);
      this.initializeForm(this.kind, el);
    } else {
      this.isNew = true;
    }
  }

  whichKind(el) {
    return el instanceof Child ? 'child' : el instanceof ComponentElement ? 'component' : el instanceof FolderElement ? 'folder' : el == null ? 'new' : null;
  }

  initializeForm(kind: string, el?) {
    if(kind == null || kind == 'new') return;
    if(kind == 'component') {
      this.form = this.formBuilder.group({
        name: [el ? el.name : '', [
          Validators.minLength(4),
          Validators.required]
        ],
        description: el ? el.description : ''
      });

    } else if (kind == 'child') {
      this.form = this.formBuilder.group({
        ref: [el ? el.ref : '', [
          Validators.required
        ]],
        qty: [el ? el.qty : '', [
          Validators.required
        ]]
      });

    } else if (kind == 'folder') {
      this.form = this.formBuilder.group({
        name: [el ? el.name : '', [
          Validators.minLength(4),
          Validators.required]
        ],
        description: el ? el.description : ''
      });
    } else {
      throw new Error('invalid type for element kind "'+kind+'"');
    }
  }

  ngOnChanges(changes: SimpleChanges) { }

  newKindChanged(attr) {
    this.kind = attr;
    this.initializeForm(attr);
  }

  reset() {
    this.initializeForm(this.whichKind(this.element), this.element);
  }

  onSubmit({ dirty, value, valid }: { dirty: boolean, value: any, valid: boolean}) {
    if(dirty && valid) { // is it valid and has something changed
      console.log(dirty, value, valid);

    } else if (!valid) {
      alert('invalid!');
    }
  }
}