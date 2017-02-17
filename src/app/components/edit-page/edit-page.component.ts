import { Component, OnInit, OnChanges } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Observable, BehaviorSubject } from 'rxjs'

import { JobService } from '../../services/job.service';
import { SearchService } from '../../services/search.service';
import { ClassToStringPipe } from '../../pipes';
import { ChildElement, ComponentElement, FolderElement } from '../../models';

@Component({
  selector: 'app-edit-page',
  templateUrl: './edit-page.component.html',
  styleUrls: ['../../styles/general.less', './edit-page.component.less']
})

export class EditPageComponent implements OnInit, OnChanges {
  public selectedElement: string = undefined;
  public selectedElementSubject: BehaviorSubject<string>;
  public openElements: any;
  public openElementIds: string[];
  private openElementsSubject: BehaviorSubject<any[]>;

  public newElement = new BehaviorSubject(null);
  public newElementType: string;
  public newElementForm: FormGroup;

  public corePart;

  public inputs: any[] = [];

  constructor(
    private jobService: JobService,
    private searchService: SearchService,
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private pipe: ClassToStringPipe
  ) { }

  ngOnInit():void{
    this.searchService.currentTypes.next(['componentElements', 'childElements']);
    this.route.parent.data.subscribe(({ job: { openElements, editWindowsEnabled, selectedElementSubject }}) => {
      editWindowsEnabled.next(false);
      this.openElementsSubject = openElements;
      this.openElementsSubject.subscribe(elements => {
        this.openElements = elements;
        this.openElementIds = Object.keys(elements);
      });
      (this.selectedElementSubject = selectedElementSubject).subscribe(element => {
        this.selectedElement = element
      });
    });
  }

  backToBuild() {
    this.router.navigate(['build'], { relativeTo: this.route.parent }); }

  ngOnDestroy() {
  }

  typeOf(element) {
    return element instanceof FolderElement ? element.type : element instanceof ComponentElement ? 'component' : element instanceof ChildElement ? 'child' : 'unknown';
  }

  cancelNew() {
    this.newElementType = undefined;
    this.newElementForm = null;
    this.inputs = [];
    this.router.navigate([], { fragment: null });
  }

  async setNewElementType(type) {
    let job = this.jobService.collectionSubject.getValue();
    this.newElementType = type;
    
    let group:any = {};
    let form = this.newElementForm;

    this.corePart = null;
    if(type == 'folder') {
      let folderTypes = job.folders.order.map(name => ({ key: name[0].toUpperCase() + name.slice(1), value: name }));
      let parentFolders = await this.jobService.getParentFolderCandidates();

      this.inputs = [ 
        {
          key: 'type',
          label: 'Folder Type',
          type: 'radio',
          options: folderTypes,
          required: true,
          description: 'The type of new folder.'
        },
        {
          key: 'parent',
          label: 'Parent Folder',
          type: 'search',
          options: parentFolders,
          filter: (arr) => arr.filter((f) => this.newElementForm.value['type'] ? this.newElementForm.value['type'] == f.type : true),
          required: true,
          description: 'Choose where to add this folder.'
        }
      ];
      Object.assign(group, { type: [undefined, Validators.required], parent: [undefined, Validators.required] });

    } else if (type == 'component') {
      //let parentElements = await this.jobService.getParentChildCandidates();
      //parentElements.unshift({ value: null, key: 'No parent'});
      this.inputs = [
        {
          key: 'sell',
          label: 'Sell Price',
          value: 0,
          type: 'number',
          min: 0,
          max: 1000000,
          step: 0.01,
          required: true,
          description: 'Override the sell price specified in core'
        },
        {
          key: 'buy',
          label: 'Buy Price',
          value: 0,
          type: 'number',
          min: 0,
          max: 1000000,
          step: 0.01,
          required: true,
          description: 'Override the buy price specified in core'
        },
        {
          key: 'qty',
          label: 'Core Part Qty',
          value: 1,
          min: 1,
          max: 1000000,
          step: 1,
          type: 'number',
          required: true,
          description: 'How many core parts are included in this representation.  Typically 1.'
        },
        /*
        {
          key: 'parent',
          label: 'Parent Element',
          type: 'search',
          filter: (arr) => arr,
          options: parentElements,
          required: false,
          description: 'Optionally immediately add this component as a child of another component'
        },
        */
        {
          key: 'catalog',
          label: 'Core Part',
          type: 'text',
          required: false,
          change: async(evt) => {
            try {
              let component: any = await this.searchComponent(evt.target.value);
              if (!component) {
                this.corePart = null;
                return;
              }
              let sell = isNaN(component.nys_price) ? 0.0 : Number(component.nys_price);
              let buy = isNaN(component.price) ? 0.0 : Number(component.price);
              this.corePart = component;
              this.newElementForm.patchValue({ buy, sell });

            } catch (e) {
              console.error(e);
              console.log('failed');
            }
          },
          description: 'Reference a (single) existing core part.'
        }
        // children
      ];

      Object.assign(group, { parent: undefined, sell: [undefined, Validators.required], buy: [undefined, Validators.required], qty: [1, Validators.required], catalog: undefined });

    } else if (type == 'child') {
      let componentElements = await this.jobService.getComponentCandidates();
      this.inputs = [
        {
          key: 'ref',
          label: 'Component',
          type: 'search',
          filter: (arr) => arr,
          options: componentElements,
          required: true,
          description: 'The existing component would you like to add.'
        },
        {
          key: 'sell',
          label: 'Sell Price',
          type: 'number',
          min: 0,
          max: 1000000,
          step: 0.01,
          required: false,
          description: 'Override sell price of descendant component/child elements.  If left undefined, use the computed value for each.'
        },
        {
          key: 'buy',
          label: 'Buy Price',
          type: 'number',
          min: 0,
          max: 1000000,
          step: 0.01,
          required: false,
          description: 'Override buy price of descendant component/child elements.  If left undefined, use the computed value for each.'
        },
        {
          key: 'qty',
          label: 'Component Qty',
          value: 1,
          min: 1,
          max: 1000000,
          step: 1,
          type: 'number',
          required: 'true',
          description: 'The quantity of components to add'
        }
      ];

      Object.assign(group, { ref: [undefined, Validators.required], sell: undefined, buy: undefined, qty: [1, Validators.required] });

    } else {
      throw new Error('invalid type "'+type+'"');
    }

    Object.assign(group, {
      name: 'New ' + type[0].toUpperCase() + type.slice(1),
      description: 'description'
    });

    this.newElementForm = this.formBuilder.group(group);
  }

  searchComponent(id) {
    return this.searchService.moreDetail(id);
  }

  setSelectedElement(element) {
    this.selectedElement = element;
  }

  onSubmit(form) {
    let val = form.value;
    let Class = this.pipe.transform(this.newElementType);
    this.jobService.createElement(val, Class).then(element => {
      this.newElement.next(element);
      this.newElementType = undefined;
      this.newElementForm = null;
      this.inputs = [];
      this.router.navigate([], { fragment: [this.pipe.transform(element), element.id].join('/') });

    }).catch(err => {
      console.error(err);
    });
  }

  ngOnChanges(changes) {
  }

  closeOpenElement(element) {
    this.jobService.closeOpenElement(element);
    this.router.navigate([], { fragment: null });
  }

}
