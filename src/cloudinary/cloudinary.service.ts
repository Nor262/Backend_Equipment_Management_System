import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  uploadFile(file: Express.Multer.File): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'btl_equipment' },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Cloudinary upload failed: Empty result'));
          resolve(result);
        },
      ).end(file.buffer);
    });
  }

  async uploadFromUrl(url: string): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return cloudinary.uploader.upload(url, {
      folder: 'btl_users_avatar',
    });
  }

}
