import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ server: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ getSupabaseServer: mocks.server }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { lookupOwner, setMenuAvailability } from "./cafe-management";

function client(admin: boolean, owner: boolean) {
  const ownership = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({data:owner?{user_id:"user"}:null}) };
  const menu = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({data:{id:"menu"},error:null}) };
  const profiles = { select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{id:"00000000-0000-4000-8000-000000000001",display_name:"Cafe member"},error:null}) };
  const sb={auth:{getUser:vi.fn().mockResolvedValue({data:{user:{id:"user"}}})},rpc:vi.fn().mockResolvedValue({data:admin}),from:vi.fn((table:string)=>table==="cafe_owners"?ownership:table==="profiles"?profiles:menu)};
  mocks.server.mockResolvedValue(sb); return {sb,menu,profiles};
}
describe("menu availability and owner lookup authorization",()=>{
 beforeEach(()=>vi.clearAllMocks());
 it("rejects guest changes before database access",async()=>{
  const {sb,menu}=client(false,false);sb.auth.getUser.mockResolvedValue({data:{user:null}} as never);
  expect(await setMenuAvailability("cafe","menu",false)).toMatchObject({ok:false});
  expect(menu.update).not.toHaveBeenCalled();
 });
 it("rejects another cafe's member",async()=>{
  const {menu}=client(false,false);expect(await setMenuAvailability("cafe","menu",false)).toMatchObject({ok:false});expect(menu.update).not.toHaveBeenCalled();
 });
 it("updates only availability and scopes by both cafe and menu",async()=>{
  const {menu}=client(false,true);expect(await setMenuAvailability("cafe","menu",false)).toMatchObject({ok:true});
  expect(menu.update).toHaveBeenCalledWith({is_available:false});expect(menu.eq).toHaveBeenCalledWith("cafe_slug","cafe");expect(menu.eq).toHaveBeenCalledWith("id","menu");
 });
 it("does not disclose profiles to cafe owners",async()=>{
  const {profiles}=client(false,true);expect(await lookupOwner("cafe","00000000-0000-4000-8000-000000000001")).toEqual({ok:false});expect(profiles.select).not.toHaveBeenCalled();
 });
 it("returns only the verified account ID and display name to admins",async()=>{
  const {profiles}=client(true,false);expect(await lookupOwner("cafe","00000000-0000-4000-8000-000000000001")).toEqual({ok:true,id:"00000000-0000-4000-8000-000000000001",name:"Cafe member"});expect(profiles.select).toHaveBeenCalledWith("id,display_name");
 });
 it("fails closed when the database reports a menu update error",async()=>{
  const {menu}=client(false,true);menu.single.mockResolvedValue({data:null,error:{message:"denied"}} as never);
  expect(await setMenuAvailability("cafe","menu",true)).toMatchObject({ok:false});expect(mocks.revalidate).not.toHaveBeenCalled();
 });
});
