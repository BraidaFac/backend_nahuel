/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { UploadsService } from './uploads.service';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          let uploadPath = join(process.cwd(), 'uploads');

          // Intentar obtener el nombre del cliente del body o params
          console.log(req.body);

          const clienteName =
            req.body?.clienteName ||
            req.body?.clientName ||
            req.query?.clienteName ||
            'NO_CLIENTE';

          if (clienteName) {
            // Sanitizar el nombre del cliente
            const sanitizedName = clienteName
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-zA-Z0-9\s-]/g, '')
              .replace(/\s+/g, '_')
              .trim();

            uploadPath = join(uploadPath, sanitizedName);

            // Crear la carpeta del cliente si no existe
            if (!existsSync(uploadPath)) {
              mkdirSync(uploadPath, { recursive: true });
            }
          }

          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // Generar nombre único con timestamp y nombre original
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const name = file.originalname.replace(ext, '');
          cb(null, `${name}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Validar tipos de archivo permitidos
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'application/pdf',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              'Tipo de archivo no permitido. Solo se aceptan: JPG, JPEG, PNG, PDF',
            ),
            false,
          );
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo por archivo
      },
    }),
  ],
  controllers: [],
  providers: [UploadsService],
  exports: [UploadsService, MulterModule],
})
export class UploadsModule {}
