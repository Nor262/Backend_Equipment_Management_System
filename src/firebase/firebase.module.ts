import { Module, Global } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

@Global() // Đánh dấu Global để tất cả module khác đều có thể inject FirebaseService
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
