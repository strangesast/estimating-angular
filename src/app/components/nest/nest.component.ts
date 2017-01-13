import {
  ComponentFactoryResolver,
  ReflectiveInjector,
  ComponentFactory,
  ViewContainerRef,
  AfterViewInit,
  ComponentRef,
  ElementRef,
  ViewChild,
  Component,
  OnChanges,
  OnInit,
  Input
} from '@angular/core';

import { Observable, BehaviorSubject } from 'rxjs';
import { Selection, HierarchyNode } from 'd3';
import * as D3 from 'd3';

import { TypeToClassPipe } from '../../pipes/type-to-class.pipe'
import { Child } from '../../models/classes';

let cnt = 0;

@Component({
  selector: 'app-nest',
  templateUrl: './nest.component.html',
  styleUrls: ['./nest.component.less'],
  providers: [ TypeToClassPipe ]
})
export class NestComponent implements OnInit {
  @Input() nest: any;
  @Input() roots: any;
  @Input() data: any[];
  @Input() order: string[];

  // should be replaysubject
  private nestSubject: BehaviorSubject<any>;

  //@ViewChild('parent', {read: ViewContainerRef}) _parent: ViewContainerRef; // parent container html element ref
  private host: Selection<any, any, any, any>;
  private htmlElement: HTMLElement;
  private childComponentFactory: ComponentFactory<any>;
  private elementComponentRefMap: Map<HTMLElement, ComponentRef<any>>;

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private element: ElementRef,
    private typeToClassPipe: TypeToClassPipe
  ) { }

  ngOnInit() {
    this.elementComponentRefMap = new Map();
    //this.childComponentFactory = this.componentFactoryResolver.resolveComponentFactory(SimpleTreeElementComponent);
  }

  /*
  createChildComponent(data, index) {
    let inputProviders = [{
      provide: 'data',
      useValue: data
    }];

    let resolvedInputs = ReflectiveInjector.resolve(inputProviders);
    let injector = ReflectiveInjector.fromResolvedProviders(resolvedInputs, this._parent.parentInjector);
    let componentRef = this.childComponentFactory.create(injector);
    this._parent.insert(componentRef.hostView);
    let element = componentRef.instance.elementRef.nativeElement;
    this.elementComponentRefMap.set(element, componentRef);
    return element;
  }

  */
  ngAfterViewInit() {
    this.htmlElement = this.element.nativeElement.querySelector('ul');
    this.host = D3.select(this.htmlElement);
    this.nest.flatMap(this.subjectUpdate.bind(this)).subscribe();
    //this.update(this.nest);
  }

  subjectUpdate({ entries, keys }) {

    let calc = (selection, data?, level=2) => {
      let nodesSelection = selection.selectAll('li')
        .data(data ? data.filter(d => d instanceof D3.hierarchy) : (d) => d.values.filter(d => d instanceof D3.hierarchy));

      console.log('selection', nodesSelection);

      nodesSelection.exit().remove();
      nodesSelection = nodesSelection
        .enter()
        .append('li')
        .merge(nodesSelection)
        .text((n:any) => n.data.name);

      let groupsSelection = selection.selectAll('ul')
        .data(data ? data.filter(d => !(d instanceof D3.hierarchy)) : (d) => d.values.filter(d => !(d instanceof D3.hierarchy)));

      groupsSelection.exit().remove();
      groupsSelection = groupsSelection
        .enter()
        .append('ul')
        .merge(groupsSelection)
        .text((d:any) => {
        let folder = folders[d.key];
        return folder.ancestors().reverse().slice(1).map(node => node.data.name).join(' > ');
      });

      return level > 0 ? calc(groupsSelection, undefined, level-1) : groupsSelection;
    }

    // store folder ref for D3 access
    let folders = {};
    keys.forEach(folder => folder.descendants().forEach(child => folders[child.data.id] = child));

    // data setup
    let nest = D3.nest();
    keys.forEach(key => nest = nest.key((d:any) => d.data.folders[this.order.indexOf(key.data.type)]));
    let data = nest.entries(entries);

    console.log('data', data);
    calc(this.host, data, keys.length);

    /*
    let firstSelection = this.host.selectAll('ul').data(data.filter(n => !(n instanceof D3.hierarchy)));
    let firstSelectionAlt = this.host.selectAll('li').data(data.filter(n => n instanceof D3.hierarchy), (d:any) => d.data.id);

    firstSelection.exit().remove();
    firstSelection = firstSelection.enter().append('ul')
      .merge(firstSelection)

    firstSelection
      .text(d => folders[d.key].data.name);

    firstSelectionAlt.exit().remove();
    firstSelectionAlt.enter().append('li').merge(firstSelectionAlt).text((n:any) => n.data.name);

    let secondSelection = firstSelection.selectAll('ul').data((d:any) => d.values.filter(n => !(n instanceof D3.hierarchy)));
    let secondSelectionAlt = firstSelection.selectAll('li').data((d:any) => d.values.filter(n => n instanceof D3.hierarchy));

    secondSelection.exit().remove();
    secondSelection = secondSelection.enter().append('ul')
      .merge(secondSelection)

    secondSelection
      .text((d:any) => folders[d.key].data.name);

    secondSelectionAlt.exit().remove();
    secondSelectionAlt.enter().append('li').merge(secondSelectionAlt).text((n:any) => n.data.name);

    let thirdSelection = secondSelection.selectAll('li').data((d:any) => d.values);

    thirdSelection.exit().remove();
    thirdSelection = thirdSelection.enter().append('li')
      .merge(thirdSelection)

    thirdSelection
      .text((d:any) => d.data.name);
    */

    /*
    console.log('entries', entries, 'keys', keys);
    let arr:any = [];

    let nest = D3.nest()
    console.log('order', this.order, 'keys', keys);
    keys.forEach(key => {
      nest = nest.key((d:any) => {
        let res = d.data.folders[this.order.indexOf(key.data.type)]
        return res;
      });
    })

    let data = nest.entries(entries);

    let selection = this.host;

    selection

    keys.forEach((key, i) => {
      let _class = ['fa', this.typeToClassPipe.transform(key.data.type)].join(' ');
      selection.text(''); // necessary? ...yes.
      let title = selection.selectAll('span.title').data((d) => {
        // this is bugged
        return [d ? d.key : 'root'];
      });
      let enter = title.enter()
        .append('span')
        .attr('class', 'title')
        .attr('tabindex', '0');
      enter.append('span').attr('class', _class);
      enter.append('span').text(d => d);

      selection.selectAll('li').data([]).exit().remove();
      selection = selection.selectAll('ul').data(d => d ? d.values : data).enter().append('ul').text((d:any) => {
      });
    });

    if(selection == this.host) selection.text('');
    //selection.selectAll('span.title').data([]).exit().remove();
    selection.selectAll('ul').data([]).exit().remove();
    let row = selection.selectAll('li').data((d:any) => d ? d.values : data).enter()
      .append('li')
      .attr('tabindex', '0')
      .attr('children', (d:any)=> d.children ? d.children.length || null : null)

    row.append('span').attr('class', 'icon fa fa-cubes')
    row.append('span').attr('class', 'hoverlink name').text((d:any) => d.data.value.name)
    row.append('span').attr('class', 'spacer');
    row.append('span').attr('class', 'description').text((d:any) => d.data.value.description);
    row.append('span').attr('class', 'qty').text((d:any) => d.data.value.qty);
    row.append('span').attr('class', 'hoverlink fa fa-angle-up collapse');
    row.attr('draggable', true);
    row.append('span').attr('class', 'fa fa-grip grip');
    
    */
    return Observable.never();
  }

  ngOnChanges(changes: any) {
    /*
    if('nest' in changes) {
      this.update(this.nest);
    }
    */
  }
}
