import logger from '@/configs/logger';
import { currentMember, getSession } from '@/lib/api-client';
import { AxiosHeaders } from 'axios';
import { Request, Response, NextFunction } from 'express';

export default async function sessionDeserializer(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const headers = new AxiosHeaders();
  headers.set('Cookie', req.headers.cookie as string);
  const session = await getSession(headers);
  if (session) {
    req.session = session.session;
  }
  if (session?.user) {
    const member = await currentMember(headers);
    if (member) {
      req.user = {
        ...session.user,
        department: member.departmentSlug || '',
        departmentRole: member.role || '',
      };
    }
  }
  next();
}
