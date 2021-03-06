import { 
  EventEmitter,
  OnChanges,
  Component,
  OnDestroy,
  OnInit,
  Output,
  Input
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Observable, Subscription, BehaviorSubject } from 'rxjs';

import * as D3 from 'd3';
import { ElementService } from '../../services/element.service';
import { SearchService } from '../../services/search.service';
import { Collection, CatalogPart, LocationElement, ComponentElement, ChildElement, FolderElement } from '../../models';

// for use in edit page in '.main' and on build / elsewhere in lower window

@Component({
  selector: 'app-edit-window',
  templateUrl: './edit-window.component.html',
  styleUrls: ['../../styles/general.less', './edit-window.component.less'],
  host: {
    '[class.isWindow]': 'isWindow',
    '[class.isOpen]': 'config.open'
  }
})
export class EditWindowComponent implements OnInit, OnChanges, OnDestroy {
  @Input() config: any = {};
  @Input() element: BehaviorSubject<ComponentElement|FolderElement|ChildElement|null>;
  public _element: ComponentElement|FolderElement|ChildElement|null;
  public type: string = 'unknown';
  @Output() close = new EventEmitter();

  @Input() isNew: boolean;

  public context: any;
  public refComponentEnabled: boolean = false;
  public refComponentPath: any = false;
  public treeConfig: any = { maxDepth: 1 };
  public root: any;

  public corePart;

  public fullPath: any;

  private form: FormGroup;
  
  private elementSub: Subscription;

  @Input() isWindow: boolean = false;

  constructor(private elementService: ElementService, private formBuilder: FormBuilder, private searchService: SearchService) { }

  ngOnInit() {
    let el = this.element;
    this.corePart = null;
    if(el) this.initElement(el);
  }

  initElement(element) {
    return this.elementSub = element.subscribe(_element => {
      let group: any = {};

      if (_element instanceof ComponentElement ||
          _element instanceof ChildElement ||
          _element instanceof FolderElement ||
          _element instanceof Collection ||
          _element instanceof LocationElement) {
        group.name = [_element.name, Validators.required];
        group.description = _element.description;
      }

      if (_element instanceof ComponentElement) {
        group.buy = _element.buy;
        group.sell = _element.sell;
        group.qty = [_element.qty, Validators.required];
        group.catalog = _element.catalog;
        this.corePartChange(group.catalog);

      } else if (_element instanceof ChildElement) {
        group.qty = [_element.qty, Validators.required];

      } else if (_element instanceof Collection) {
        group.shortname = [_element.shortname, Validators.required, Validators.minLength(4)];
      }

      this.form = this.formBuilder.group(group);

      if(_element instanceof ChildElement) {
        this.elementService.getChildData(_element).then(() =>
          this.elementService.getFullPath(_element.data).then(path =>
            this.refComponentPath = path));
      }

      this._element = _element;

      this.elementService.getFullPath(_element).then(path => this.fullPath = path);

      if (!this.isWindow) {
        if (_element instanceof ChildElement ||
            _element instanceof FolderElement ||
            _element instanceof ComponentElement) {
          this.buildChildTree(_element);
        }
      }
    });
  }

  buildChildTree(el) {
    return this.elementService.resolveElementTree(el.clean()).then(copy => {
      let node = D3.hierarchy(copy, (n: any) => n.data ? [n.data] : n.children);
      if (this.root) {
        this.root.next(node);

      } else {
        this.root = new BehaviorSubject(node);
      }
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

  async handleDrop({ dropped, on }) {
    let element = this.element.getValue();
    if (on.id !== element.id) return;
    
    if(dropped instanceof FolderElement || dropped instanceof ComponentElement || dropped instanceof ChildElement) {
      if (dropped.collection === '') dropped.collection = on.collection;
      if (on.collection !== dropped.collection) return;
      let job = element.collection;

      if (element instanceof ComponentElement) {
        if (dropped instanceof ComponentElement) {
          await this.elementService.addChildElement(job, element, dropped)

        } else if (dropped instanceof ChildElement) {
          throw new Error('invalid (unsupported)');

        } else {
          throw new Error('invalid');

        }
        let component = await this.elementService.getComponent(element.id);
        await this.buildChildTree(component);


      } else if (element instanceof ChildElement) {

      } else if (element instanceof FolderElement && dropped instanceof FolderElement) {
        await this.elementService.addChildElement(job, on, dropped);
        let folder = await this.elementService.getFolder(element.id);
        await this.buildChildTree(folder);
      }

    } else if (dropped instanceof CatalogPart) {
      console.log('dropped', dropped);

      //let component = new ComponentElement(
      //  name,
      //  description,
      //  sell: number,
      //  buy: number,
      //  collection: string|number,
      //  children: (number|string)[]|ChildElement[] = [],
      //  qty: number = 1,
      //  catalog: string,
      //  basedOn?: BasedOn|null,
      //  hash?: string,
      //  saveState: SaveState = 'unsaved'
      //)
    }
  }

  setMaxDepth(n) {
    this.treeConfig.maxDepth = n;
    this.root.next(this.root.getValue());
  }

  async corePartChange(id) {
    if(!id) return;
    try {
      let component = await this.searchService.moreDetail(id);
      let sell = isNaN(component.nys_price) ? 0.0 : Number(component.nys_price);
      let buy = isNaN(component.price) ? 0.0 : Number(component.price);
      this.form.patchValue({ sell, buy });
      this.corePart = component;
    } catch (e) {

    }


  }

  ngOnDestroy() {
    this.elementSub.unsubscribe();
  }

}
