import { EstimatingAngularPage } from './app.po';

describe('estimating-angular App', function() {
  let page: EstimatingAngularPage;

  beforeEach(() => {
    page = new EstimatingAngularPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
