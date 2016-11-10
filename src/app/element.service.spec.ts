/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ElementService } from './element.service';

import {
  User,
  TreeElement,
  Element,
  Child,
  BasedOn,
  Component,
  Location,
  FolderDef,
  Folder,
  Job
} from './classes';


function random():string {
  return (Math.random().toString(36)+'00000000000000000').slice(2, 10+2);
}

describe('Service: Element', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ElementService]
    });
  });

  let TEST_USER: User = new User(
    'Sam Zagrobelny', // name
    'sazagrobelny', // username
    'sazagrobelny@dayautomation.com' // email
  );
  
  let TEST_JOB: Job = new Job(
    random(), // id
    'Test Job 123', // name
    '', // description
    TEST_USER, // owner
    'test_job_123', // shortname
    { // folders
      types: ['phase', 'building']
    }
  );

  let test = () => {
    return Promise.resolve().then(()=> {
      // user creation
      return this.getUsers().then((users) => {
        let usernames = users.map((u)=>u.username);
        if(usernames.indexOf(TEST_USER.username) == -1) {
          return this.saveUser(TEST_USER);
        }
      });
    }).then(() => {
      // job creation
      return this.getJobs().then((jobs)=>{
        let i = jobs.map((j)=>j.shortname).indexOf(TEST_JOB.shortname);
        if(i == -1) {
          return this.saveNewJob(TEST_JOB).then((obj)=>{
            return obj.job;
          });
        } else {
          return jobs[i];
        }
      }).then((job)=>{

        // try changing description
        job.description = 'new description';

        let message = 'updated description';
        return this.saveJob(job, message).catch((err)=>{
          console.error(err);
        }).then(()=>{
          return job;
        });
      });
    }).then((job)=>{
      let component = new Component(
        random(), // id
        'first component', // name
        '', // description
        job.id // job id
      );
      let folder = new Folder(
        random(),
        'New Phase ' + Math.round(Math.random()*10),
        'folder',
        'phase',
        job.id,
        []
      );
      this.addFolder(folder, null, job).then((result)=>{
        console.log('added folder', result);
      });
      this.addComponent(component, job, {}).then((results)=>{
        console.log('added component', results);
        this.buildTree(job).then((res)=>{
          Promise.all(res.map((el)=>{
            return (el.reftype == 'component' ? this.retrieveComponent(el.refid) : this.retrieveFolder(el.refid)).then((doc)=>{
              return Object.assign({}, el, doc);
            });
          })).then((arr:any)=>{
            for(let i=0; i<arr.length; i++) {
              let r = arr[i];
              console.log(r.level + Array(+r.level+1).join('--') + '(' + r.reftype + ') ' + r.refid + ' ' + r.name);
            }
          });
        });
      });
    });
  }

  it('should ...', inject([ElementService], (service: ElementService) => {
    expect(service).toBeTruthy();
  }));
});
