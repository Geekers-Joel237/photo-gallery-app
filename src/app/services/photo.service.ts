import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Storage } from '@capacitor/storage';
import { Platform } from '@ionic/angular';
import UserPhoto from '../models/userPhoto.models';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {

  photos: UserPhoto[] = [];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private PHOTO_STORAGE = 'photos';
  private platform: Platform;

  constructor(
    platform: Platform,

  ) {
    this.platform = platform;
  }

  public async addNewToGallery(){
    //Take a photo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source:CameraSource.Camera,
      quality:100
    });

    const savedImageFile = await this.savePicture(capturedPhoto);

    this.photos.unshift({
      filepath:'soon...',
      webviewpath: capturedPhoto.webPath
    });

    Storage.set({
      key:this.PHOTO_STORAGE,
      value:JSON.stringify(this.photos)
    });
  }

  private async savePicture(photo: Photo){
    //convert photo to base64 format, required by Filesystem API to save
    const base64Data = await this.readAsBase64(photo);

    //write the file to the data directory
    const fileName = new Date().getTime() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path:fileName,
      data: base64Data,
      directory:Directory.Data
    });

    if(this.platform.is('hybrid')){
      //Display the new img by rewriting the 'file://path to HTTP
      //Details:https://ionicfranework.com/docs/building/webview#file-protocol
      return {
        filepath: savedFile.uri,
      webviewPath:Capacitor.convertFileSrc(savedFile.uri)
      };
    }else {
    //Use webPath to display the new image instead of base64 siince it's
    //already loaded into memory
    return {
      filepath: fileName,
      webviewPath:photo.webPath
    };
  }
  }

  private async readAsBase64(photo: Photo){
    //"hybrid" will detect Cordova or Capacitor
    if(this.platform.is('hybrid')){
      const file = await Filesystem.readFile({
        path: photo.path
      });

      return file.data;
    }else{
    //fetch the photo,read as a blob,then convert to base64 format
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const response = await fetch(photo.webPath!);
    const blob = await response.blob();

    return await this.convertBlobToBase64(blob) as string;
    }
  }

  private convertBlobToBase64 = (blob: Blob)=>new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);

  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  public async loadSaved(){
    //Retrieve cached photo array data
    const photoList = await Storage.get({key: this.PHOTO_STORAGE});
    this.photos = JSON.parse(photoList.value) || [];

    //Easiest way to detect when running on the web:
    //"when the platform is NOT hybrid, do this"
    if(!this.platform.is('hybrid')){

      //Display the photo by reading into base64 format
      // eslint-disable-next-line prefer-const
      for(let photo of this.photos){
        //Read each file saved photo's data from the FileSystem
        const readFile = await Filesystem.readFile({
          path:photo.filepath,
          directory:Directory.Data,
        });

        //Web platform only: load the photo as base64 data
        photo.webviewpath = `data:image/jpeg;base64,${readFile.data}`;
      }
    }
  }

  public async deletePicture(photo:UserPhoto,position:number){
    //Remove this photo from the photos reference data array
    this.photos.splice(position,1);

    //Udpate photos array cache by overwriting the existing photo array
    Storage.set({
      key:this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos)
    });

    //delete photo from the file system
    const fileName = photo.filepath.
    substr(photo.filepath.lastIndexOf('/'+1));

    await Filesystem.deleteFile({
      path:fileName,
      directory:Directory.Data
    });
  }

  }



