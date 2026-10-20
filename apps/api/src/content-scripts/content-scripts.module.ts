import { Module } from '@nestjs/common';
import { ContentScriptsService } from './content-scripts.service';
import { ContentScriptsController } from './content-scripts.controller';

@Module({
  controllers: [ContentScriptsController],
  providers: [ContentScriptsService],
  exports: [ContentScriptsService],
})
export class ContentScriptsModule {}
