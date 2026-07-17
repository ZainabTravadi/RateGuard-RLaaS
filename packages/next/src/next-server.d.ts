declare module "next/server" {
  export interface NextRequest extends Request {
    nextUrl: URL;
    ip?: string;
  }

  export class NextResponse extends Response {
    static next(init?: ResponseInit): NextResponse;
    static json(body: unknown, init?: ResponseInit): NextResponse;
  }
}
