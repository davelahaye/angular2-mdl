import {
  Component,
  Input,
  OnInit,
  AfterContentInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ContentChildren,
  QueryList
} from '@angular/core';
import { MdlButtonComponent } from './../button/mdl-button.component';
import { MdlMenuItemComponent }  from './mdl-menu-item.component';
import { MdlError } from './../common/mdl-error';

const BOTTOM_LEFT   = 'bottom-left';
const BOTTOM_RIGHT  = 'bottom-right';
const TOP_LEFT      = 'top-left';
const TOP_RIGHT     = 'top-right';
const UNALIGNED     = 'unaligned';

// Total duration of the menu animation.
const TRANSITION_DURATION_SECONDS = 0.3;
// The fraction of the total duration we want to use for menu item animations.
const TRANSITION_DURATION_FRACTION =  0.8;
// How long the menu stays open after choosing an option (so the user can see
// the ripple).
const CLOSE_TIMEOUT = 150;

const CSS_ALIGN_MAP = {};
CSS_ALIGN_MAP[BOTTOM_LEFT] = 'mdl-menu--bottom-left';
CSS_ALIGN_MAP[BOTTOM_RIGHT] = 'mdl-menu--bottom-right';
CSS_ALIGN_MAP[TOP_LEFT] = 'mdl-menu--top-left';
CSS_ALIGN_MAP[TOP_RIGHT] = 'mdl-menu--top-right';
CSS_ALIGN_MAP[UNALIGNED] = 'mdl-menu--unaligned';


export class MdlMenuError extends MdlError {
}

@Component({
  selector: 'mdl-menu',
  host: {
  },
  exportAs: 'mdlMenu',
  template: `
   <div #container class="mdl-menu__container is-upgraded">
      <div #outline class="mdl-menu__outline"
         [ngClass]="cssPosition"
      ></div>
      <div class="mdl-menu" #menuElement>
         <ng-content></ng-content>
      </div>
   </div>
  `,
  directives: [MdlMenuItemComponent]
})
export class MdlMenuComponent implements OnInit, AfterContentInit, AfterViewInit {
  @Input('mdl-menu-position') position:string;

  @ViewChild('container') containerChild:ElementRef;
  container:HTMLElement;

  @ViewChild('menuElement') menuElementChild:ElementRef;
  menuElement:HTMLElement;

  @ViewChild('outline') outlineChild:ElementRef;
  outline:HTMLElement;

  @ContentChildren(MdlMenuItemComponent)
  menuItemComponents: QueryList<MdlMenuItemComponent>;

  cssPosition = 'mdl-menu--bottom-left';

  isVisible   = false;

  ngOnInit(){
    this.cssPosition = CSS_ALIGN_MAP[this.position] || BOTTOM_LEFT;
  }

  ngAfterViewInit(){
    this.container    = this.containerChild.nativeElement;
    this.menuElement  = this.menuElementChild.nativeElement;
    this.outline      = this.outlineChild.nativeElement;
  }

  ngAfterContentInit(){
    //console.log(this.menuItemComponents);
  }


  toggle(event: Event , mdlButton: MdlButtonComponent){
    if(!mdlButton){
      throw new MdlMenuError(`MdlButtonComponent is required`);
    }
    if(this.isVisible){
      this.hide();
    } else {
      this.show(event, mdlButton);
    }
  }

  hideOnItemClicked(){
    // Wait some time before closing menu, so the user can see the ripple.
    setTimeout( ()=> {
      this.hide();
    }, CLOSE_TIMEOUT);
  }
  
  hide(){
    // Remove all transition delays; menu items fade out concurrently.
    this.menuItemComponents.toArray().forEach(mi => {
      mi.element.style.removeProperty('transition-delay');
    });

    // Measure the inner element.
    var rect = this.menuElement.getBoundingClientRect();
    var height = rect.height;
    var width = rect.width;

    // Turn on animation, and apply the final clip. Also make invisible.
    // This triggers the transitions.
    this.menuElement.classList.add('is-animating');
    this.applyClip(height, width);
    this.container.classList.remove('is-visible');

    // Clean up after the animation is complete.
    this.addAnimationEndListener();

    this.isVisible = false;
  }

  show(event, mdlButton){

    var forElement  = mdlButton.element;
    var rect        = forElement.getBoundingClientRect();
    var forRect     = forElement.parentElement.getBoundingClientRect();

    if (this.position == UNALIGNED) {
      // Do not position the menu automatically. Requires the developer to
      // manually specify position.
    } else if ( this.position == BOTTOM_RIGHT ) {
      // Position below the "for" element, aligned to its right.
      this.container.style.right = (forRect.right - rect.right) + 'px';
      this.container.style.top = forElement.offsetTop + forElement.offsetHeight + 'px';
    } else if ( this.position == TOP_LEFT ) {
      // Position above the "for" element, aligned to its left.
      this.container.style.left = forElement.offsetLeft + 'px';
      this.container.style.bottom = (forRect.bottom - rect.top) + 'px';
    } else if ( this.position == TOP_RIGHT ) {
      // Position above the "for" element, aligned to its right.
      this.container.style.right = (forRect.right - rect.right) + 'px';
      this.container.style.bottom = (forRect.bottom - rect.top) + 'px';
    } else {
      // Default: position below the "for" element, aligned to its left.
      this.container.style.left = forElement.offsetLeft + 'px';
      this.container.style.top = forElement.offsetTop + forElement.offsetHeight + 'px';
    }

    // Measure the inner element.
    var height = this.menuElement.getBoundingClientRect().height;
    var width = this.menuElement.getBoundingClientRect().width;

    this.container.style.width = width + 'px';
    this.container.style.height = height + 'px';
    this.outline.style.width = width + 'px';
    this.outline.style.height = height + 'px';

    var transitionDuration = TRANSITION_DURATION_SECONDS * TRANSITION_DURATION_FRACTION;
    this.menuItemComponents.toArray().forEach(mi => {
      var itemDelay = null;
      if (( this.position == TOP_LEFT ) || this.position == TOP_RIGHT ) {
        itemDelay = ((height - mi.element.offsetTop - mi.element.offsetHeight) / height * transitionDuration) + 's';
      } else {
        itemDelay = (mi.element.offsetTop / height * transitionDuration) + 's';
      }
      mi.element.style.transitionDelay = itemDelay;
    });

    // Apply the initial clip to the text before we start animating.
    this.applyClip(height, width);

    this.container.classList.add('is-visible');
    this.menuElement.style.clip = 'rect(0 ' + width + 'px ' + height + 'px 0)';
    this.menuElement.classList.add('is-animating');

    this.addAnimationEndListener();

    this.isVisible = true;

    // Add a click listener to the document, to close the menu.
    var callback = function(e) {
      // Check to see if the document is processing the same event that
      // displayed the menu in the first place. If so, do nothing.
      if (e !== event ) {
        document.removeEventListener('click', callback);
        this.hide();
      }
    }.bind(this);
    document.addEventListener('click', callback);
  }


  addAnimationEndListener(){
    this.menuElement.addEventListener('transitionend', () => this.animationEnd);
    this.menuElement.addEventListener('webkitTransitionEnd', () => this.animationEnd);
  }

  animationEnd(){
    this.menuElement.classList.remove('is-animating');
  }

  applyClip(height, width){
    if (this.position == UNALIGNED) {
      // Do not clip.
      this.menuElement.style.clip = '';
    } else if (this.position == BOTTOM_RIGHT ) {
      // Clip to the top right corner of the menu.
      this.menuElement.style.clip = 'rect(0 ' + width + 'px ' + '0 ' + width + 'px)';
    } else if (this.position == TOP_LEFT) {
      // Clip to the bottom left corner of the menu.
      this.menuElement.style.clip = 'rect(' + height + 'px 0 ' + height + 'px 0)';
    } else if (this.position == TOP_RIGHT) {
      // Clip to the bottom right corner of the menu.
      this.menuElement.style.clip = 'rect(' + height + 'px ' + width + 'px ' + height + 'px ' + width + 'px)';
    } else {
      // Default: do not clip (same as clipping to the top left corner).
      this.menuElement.style.clip = '';
    }
  }
}

