import { NotificationService } from './../notification.service';
import { CognitoService } from './../cognito.service';
import { Router } from '@angular/router';
import { HomeService } from './home.service';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogModule,
} from '@angular/material/dialog';
import { ViewDetailsWithoutLoginComponent } from '../view-details-without-login/view-details-without-login.component';
import { NotificationsComponent } from '../notifications/notifications.component';
interface Post {
  id: string;
  location: string;
  name: string;
  imageUrl: string;
  firstName: string;
  age: number;
  animalType: string;
  breed: string;
  createdAt: string;
  description: string;
  gender: string;
  medicalHistory: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  posts: Post[] = [];
  isLoading: boolean = false;
  isPageScroll: boolean = false;
  searchSuggestions: string[] = [];
  isDropDownVisible: boolean = false;
  notificationData!: Notification;
  // showMenu: boolean = false;

  // this variable is used to add focus on the list, -1 represents no focus
  // 0 represents 1st element and so on...
  selectedIndex: number = -1;
  clickedItemValue: string = '';
  isAuthenticated: boolean = true;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  constructor(
    private homeService: HomeService,
    private router: Router,
    private cognitoService: CognitoService,
    public dialog: MatDialog
  ) {}
  search: string = '';

  ngOnInit() {
    this.cognitoService.isAuthenticated().then((res) => {
      this.isAuthenticated = res;
    });

    this.isLoading = true;
    this.homeService.fetchPostsHandler().then((response) => {
      response.subscribe((data) => {
        this.isLoading = false;
        this.posts = data as Post[];
        console.log(data);
      });
    });
  }

  // when page is scrolled then isPageScroll is set to true this variable is used to apply styling
  @HostListener('document:scroll')
  onScrollHandler() {
    this.isPageScroll =
      document.body.scrollTop > 0 || document.documentElement.scrollTop > 0
        ? true
        : false;
  }

  onPageClickHandler() {
    if (this.isDropDownVisible) {
      this.isDropDownVisible = false;
      this.search = '';
      this.selectedIndex = -1;
      this.searchInput.nativeElement.blur();
      this.isLoading = true;
      this.homeService.fetchPostsHandler().then((response) => {
        response.subscribe((data) => {
          this.isLoading = false;
          this.posts = data as Post[];
          console.log(data);
        });
      });
    }
  }

  notification() {
    const dialogConfig: MatDialogConfig = {
      width: '550px',
    };

    const dialogRef = this.dialog.open(NotificationsComponent, dialogConfig);
  }

  // on every change in input's value the dropdown and suggestions are enabled
  onSearchBarInputChangeHandler() {
    this.isDropDownVisible = true;
    this.setSearchSuggestions();
    this.selectedIndex = -1;
  }

  // when focus event of search bar is emitted then the dropdown and suggestions are enabled
  onSearchBarFocusHandler() {
    this.isDropDownVisible = true;
    this.setSearchSuggestions();
  }

  // this function sets the matching suggestions for current search bar's value
  setSearchSuggestions() {
    this.searchSuggestions = this.homeService.getSearchSuggestions(this.search);
  }

  /*
   1.) if user presses the ENTER KEY then the focus is removed from search bar,
   the value is selectedIndex is set to default and drop down gets hidden
   then search request is made.

   2.) if user presses UP KEY then value of selectedIndex is decremented unless it reaches 0
   3.) if user presses DOWN KEY then value of selectedIndex is incremented in roundrobin fashion
   4.) if user presses ESC KEY then we check if user hasn't pressed "UP or DOWN" ARROW KEY, if he/she hasn't
        then selectedIndex is set to -1, if he/she has then value of search is set to "", dropdown is disabled
        and focus is removed from search bar
  */
  onKeyDownHandler(event: KeyboardEvent) {
    if (event.key === 'Enter' && this.selectedIndex > -1) {
      this.searchInput.nativeElement.blur();
      this.selectedIndex = -1;
      this.isDropDownVisible = false;
      this.onSearchSubmitHandler();
    } else if (event.key === 'ArrowUp') {
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.search = this.searchSuggestions[this.selectedIndex];
    } else if (event.key === 'ArrowDown') {
      this.selectedIndex =
        (this.selectedIndex + 1) % this.searchSuggestions.length;
      this.search = this.searchSuggestions[this.selectedIndex];
    } else if (event.key === 'Escape') {
      if (this.selectedIndex === -1) {
        this.search = '';
        this.isDropDownVisible = false;
        this.searchInput.nativeElement.blur();
      }
      this.selectedIndex = -1;
    }
  }

  // search request is made if particular item is clicked
  onItemClickHandler(searchSuggestion: string) {
    this.search = searchSuggestion;
    this.selectedIndex = -1;
    this.isDropDownVisible = false;
    this.onSearchSubmitHandler();
  }

  // this function fetches the data when item clicked or pressed enter on focused item
  onSearchSubmitHandler() {
    this.isLoading = true;
    this.homeService
      .getSearchData(this.search.toLowerCase())
      .then((response) => {
        response.subscribe((data) => {
          this.isLoading = false;
          console.log('Search data:', data);
          this.posts = data.users as Post[];
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async onCardClickHandler(
    postId: string,
    age: number,
    animalType: string,
    breed: string,
    createdAt: string,
    description: string,
    gender: string,
    imageUrl: string,
    location: string,
    medicalHistory: string,
    name: string
  ) {
    try {
      // Check if the user is authenticated
      const isAuthenticated = await this.cognitoService.isAuthenticated();

      if (isAuthenticated) {
        // If authenticated, navigate to view-details page
        this.router.navigate([`/view-details/${postId}`]);
      } else {
        // If not authenticated, open the dialog with ViewDetailsWithoutLoginComponent
        const dialogConfig: MatDialogConfig = {
          width: '1500px',
          data: {
            postId: postId,
            age: age,
            animalType: animalType,
            breed: breed,
            createdAt: createdAt,
            description: description,
            gender: gender,
            imageUrl: imageUrl,
            location: location,
            medicalHistory: medicalHistory,
            name: name,
          },
        };

        const dialogRef = this.dialog.open(
          ViewDetailsWithoutLoginComponent,
          dialogConfig
        );

        dialogRef.afterClosed().subscribe((result) => {
          console.log(`Dialog result: ${result}`);
        });
      }
    } catch (error) {
      console.error('Error checking authentication status:', error);
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  navigateToHome() {
    this.router.navigateByUrl('/home');
  }
  isHovered: boolean = false;

  onCardHover(hovered: boolean): void {
    this.isHovered = hovered;
  }
  onLogoutHandler() {
    console.log('gfhfgfh');
    this.cognitoService
      .signOut()
      .then(() => {
        this.router.navigateByUrl('/landing');
      })
      .catch(() => {
        console.log('Something went wrong with logout');
      });
  }

  navigateToMyPosts() {
    this.router.navigateByUrl('/my-posts');
  }

  navigateToMyAppliedPosts() {
    this.router.navigateByUrl('/my-application');
  }

  navigateToMyProfile() {
    this.router.navigateByUrl('/profile');
  }

  navigateToMyFavorites() {
    this.router.navigateByUrl('/favorites');
  }
  // toggleMenu() {
  //   this.showMenu = !this.showMenu;
  // }
}
