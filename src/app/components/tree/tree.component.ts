import {
  ComponentFactoryResolver,
  ReflectiveInjector,
  ComponentFactory,
  ViewContainerRef,
  AfterViewInit,
  ComponentRef,
  ElementRef,
  ViewChildren,
  ViewChild,
  QueryList,
  OnChanges,
  Component,
  Input,
  OnInit
} from '@angular/core';

import { Subject, BehaviorSubject, Observable, Subscription } from 'rxjs';

import * as D3 from 'd3';
import { Selection } from 'd3';

import { TreeConfiguration } from '../../models';
import { SELECTOR, ElementDisplayComponent } from '../element-display/element-display.component';
import { SimpleTreeElementComponent, SIMPLE_TREE_ELEMENT_SELECTOR } from '../simple-tree/simple-tree-element/simple-tree-element.component';

@Component({
  selector: 'app-tree',
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.less']
})
export class TreeComponent implements OnInit, OnChanges, AfterViewInit {
  // accept array of hierarchy nodes or elements
  // allow hierarchy nodes to be toggled open / close

  @Input() root: any;
  rootValue: any;
  rootSubject: Observable<any>;
  rootSubscription: Subscription;

  @Input() config: TreeConfiguration;
  // hideRoot: boolean
  // styleRoot: boolean
  // size: string
  // dragsource: boolean
  // dragsink: boolean
  private factory: ComponentFactory<any>;
  private elementMap: Map<HTMLElement, ComponentRef<any>>;
  private host: Selection<any, any, any, any>;

  @ViewChild('container', { read: ViewContainerRef }) container: ViewContainerRef;
  public children: any[];

  constructor(private componentFactoryResolver: ComponentFactoryResolver) { }

  ngOnInit() {
    this.elementMap = new Map();
    this.children = [];
    this.factory = this.componentFactoryResolver.resolveComponentFactory(SimpleTreeElementComponent);
  }

  ngOnChanges(changes) {
    if('root' in changes) {
      this.initialize(this.root);
    }
  }

  ngAfterViewInit() {
    this.host = D3.select(this.container.element.nativeElement);
    this.initialize(this.root);
  }

  initialize(root) {
    if (this.rootSubscription) {
      this.rootSubscription.unsubscribe();
      this.rootSubscription = null;
    }
    if (root instanceof BehaviorSubject || root instanceof Subject) {
      this.rootSubject = root;
      this.rootSubscription = root.map(this.update.bind(this)).subscribe()
    } else {
      this.rootValue = root;
      this.update(root);
    }
  }

  create(data, index) {
    let config = { size: 'small' };
    let inputProviders = [
      { provide: 'data', useValue: data },
      { provide: 'config',  useValue: config }
    ];
    let resolvedInputs = ReflectiveInjector.resolve(inputProviders);
    let injector = ReflectiveInjector.fromResolvedProviders(resolvedInputs, this.container.parentInjector);
    let componentRef = this.factory.create(injector);
    let element = componentRef.instance.elementRef.nativeElement;
    this.container.insert(componentRef.hostView);
    this.elementMap.set(data, componentRef);
    return element;
  }

  remove(data: any) {
    let componentRef = this.elementMap.get(data);
    if (!componentRef) return; // should error
    componentRef.destroy();
    let i = this.children.indexOf(data);
    if (i != -1) {
      this.children.splice(i, 1);
    }
    return this.elementMap.delete(data);
  }

  update(root) {
    let arr;
    if (Array.isArray(root)) {
      arr = root;

    } else if (root instanceof D3.hierarchy) {
      arr = [];
      root.each((node) => {
        arr.push(node.data);
      });

    } else {
      console.error('invalid root node', root);
      throw new Error('invalid root node');
    }

    let selection = this.host.selectAll(SIMPLE_TREE_ELEMENT_SELECTOR).data(arr, (n: any) => n.data ? n.data.id : null || n);

    selection.exit()
      .each(this.remove.bind(this))
      .remove();

    selection.enter()
      .append(this.create.bind(this))
      .merge(selection)
      .each(data => {
        let i = this.children.indexOf(data);
        if (i == -1) {
          this.children.push(data);
        }
      });

  }
}
