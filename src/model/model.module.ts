import { Module } from '@nestjs/common';
import { ModelService } from './model.service.js';

@Module({
  providers: [ModelService],
  exports: [ModelService],
})
export class ModelModule {}
