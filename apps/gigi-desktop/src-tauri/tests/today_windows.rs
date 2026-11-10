use gigi_desktop_lib::domain;
use serde_json::{json,Value};
struct Fixture{root:std::path::PathBuf,w:Value}
impl Fixture{
 fn new()->Self{let root=std::env::temp_dir().join(format!("gigi-today-windows-{}",uuid::Uuid::new_v4()));let w=domain::dispatch(&root,"workspace.create",json!({"name":"Synthetic weekly Today"})).unwrap()["id"].clone();Self{root,w}}
 fn save(&self,entity:&str,title:&str,fields:Value)->Value{domain::dispatch(&self.root,"records.save",json!({"workspaceId":self.w,"entity":entity,"title":title,"fields":fields})).unwrap()}
 fn read(&self,day:&str,week:Option<&str>,zone:&str)->Value{let mut input=json!({"workspaceId":self.w,"today":day,"timeZone":zone});if let Some(week)=week{input["weekStart"]=json!(week)}domain::dispatch(&self.root,"today.read",input).unwrap()}
}
impl Drop for Fixture{fn drop(&mut self){let _=std::fs::remove_dir_all(&self.root);}}
fn titles(v:&Value,key:&str)->Vec<String>{v[key]["items"].as_array().unwrap().iter().map(|v|v["title"].as_str().unwrap().to_string()).collect()}
#[test]
fn tasks_filter_before_limits_and_keep_only_overdue_today_tomorrow_in_date_order(){
 let f=Fixture::new();
 for i in 0..55{f.save("tasks",&format!("Future noise {i}"),json!({"Due Date":"2026-12-01"}));}
 f.save("tasks","Tomorrow",json!({"Due Date":"2026-11-07","Priority":"High"}));
 f.save("tasks","Today",json!({"Due Date":"2026-11-06","Priority":"Low"}));
 f.save("tasks","Overdue",json!({"Due Date":"2026-10-01"}));
 f.save("tasks","Planned",json!({"Do Date":"2026-11-06"}));
 f.save("tasks","Invalid due fallback",json!({"Due Date":"2026-02-30","Do Date":"2026-11-07"}));
 for status in ["Done","Complete","Completed","Cancelled","Canceled","Archive","Archived"]{f.save("tasks",status,json!({"Status":status,"Due Date":"2026-11-01"}));}
 f.save("tasks","Undated",json!({}));f.save("tasks","Due wins",json!({"Due Date":"2026-11-08","Do Date":"2026-11-01"}));
 let read=f.read("2026-11-06",None,"America/New_York");let names=titles(&read,"tasks");
 assert_eq!(read["tasks"]["count"],5);assert_eq!(names[0],"Overdue");assert!(names[1..3].contains(&"Today".into()));assert!(names[3..].contains(&"Tomorrow".into()));
 assert!(!read.to_string().contains("Future noise"));
 assert_eq!(read["tasks"]["items"].as_array().unwrap().iter().find(|r|r["title"]=="Tomorrow").unwrap()["fields"]["Priority"],"High");
}
#[test]
fn financials_require_due_date_and_unpaid_status_and_split_saved_direction(){
 let f=Fixture::new();
 for(title,date,direction,status)in [("Past rent","2026-10-01","Expense","Overdue"),("This week expense","2026-11-08","Expense","Expected"),("Venue invoice","2026-11-06","Income","Invoiced"),("Next week","2026-11-09","Income","Expected"),("Paid","2026-11-01","Expense","Paid")]{f.save("finances",title,json!({"Due Date":date,"Direction":direction,"Status":status,"Amount":10000}));}
 f.save("finances","Unknown direction",json!({"Due Date":"2026-11-01","Status":"Expected"}));
 f.save("finances","Transaction date is not due date",json!({"Date":"2026-11-01","Direction":"Expense","Status":"Expected"}));
 let read=f.read("2026-11-06",None,"America/New_York");
 assert_eq!(titles(&read,"payable"),["Past rent","This week expense"]);assert_eq!(titles(&read,"receivable"),["Venue invoice"]);assert_eq!(read["financialThrough"],"2026-11-08");
 assert_eq!(read["payable"]["items"][0]["moneyCents"],10000);
 assert_eq!(titles(&f.read("2026-11-08",None,"UTC"),"receivable"),["Venue invoice"]);
 assert_eq!(titles(&f.read("2026-11-09",None,"UTC"),"receivable"),["Venue invoice","Next week"]);
}
#[test]
fn week_navigation_includes_weekends_ranges_and_more_than_five_without_shifting_other_windows(){
 let f=Fixture::new();
 for i in 0..8{f.save("gigs",&format!("Weekend {i}"),json!({"Date":"2026-11-07","Work kind":"Performance"}));}
 f.save("schedule","Crosses Monday",json!({"Date":"2026-11-01/2026-11-04","All Day":true}));
 f.save("schedule","Ends at Monday midnight",json!({"Date":"2026-11-01T20:00:00-05:00/2026-11-02T00:00:00-05:00"}));
 f.save("gigs","Next week gig",json!({"Date":"2026-11-10"}));f.save("gigs","Cancelled gig",json!({"Date":"2026-11-06","Status":"Cancelled"}));
 f.save("tasks","Actual tomorrow",json!({"Due Date":"2026-11-07"}));f.save("finances","Actual week",json!({"Due Date":"2026-11-08","Status":"Expected","Direction":"Income"}));
 let current=f.read("2026-11-06",None,"America/New_York");assert_eq!(current["calendar"]["weekStart"],"2026-11-02");assert_eq!(current["calendar"]["count"],9);
 let next=f.read("2026-11-06",Some("2026-11-09"),"America/New_York");assert_eq!(titles(&next,"calendar"),["Next week gig"]);assert_eq!(current["tasks"],next["tasks"]);assert_eq!(current["receivable"],next["receivable"]);
 let past=f.read("2026-11-06",Some("2026-10-26"),"America/New_York");assert_eq!(past["calendar"]["count"],2);
}
#[test]
fn local_dates_follow_viewer_timezone_and_daylight_saving_boundaries(){
 let f=Fixture::new();f.save("tasks","Offset tomorrow",json!({"Due Date":"2026-11-02T01:00:00Z"}));
 f.save("finances","Offset Sunday payment",json!({"Due Date":"2026-11-02T01:00:00Z","Direction":"Income","Status":"Expected"}));
 let ny=f.read("2026-11-01",None,"America/New_York");assert_eq!(ny["tasks"]["items"][0]["date"],"2026-11-01");assert_eq!(ny["receivable"]["count"],1);assert_eq!(ny["calendar"]["weekStart"],"2026-10-26");
 let utc=f.read("2026-11-01",None,"UTC");assert_eq!(utc["tasks"]["items"][0]["date"],"2026-11-02");assert_eq!(utc["receivable"]["count"],0);
}
#[test]
fn read_is_workspace_scoped_validates_inputs_and_does_not_mutate_records_or_history(){
 let f=Fixture::new();let saved=f.save("tasks","Keep unchanged",json!({"Due Date":"2026-11-06","Priority":"Custom"}));
 let history=||domain::dispatch(&f.root,"history.list",json!({"workspaceId":f.w,"limit":50})).unwrap();let before=history();
 f.read("2026-11-06",None,"UTC");let after=domain::dispatch(&f.root,"records.get",json!({"workspaceId":f.w,"entity":"tasks","id":saved["id"],"detail":"full"})).unwrap();assert_eq!(after["fields"],saved["fields"]);assert_eq!(before,history());
 let other=uuid::Uuid::new_v4().to_string();rusqlite::Connection::open(f.root.join("gigi.sqlite")).unwrap().execute("INSERT INTO workspaces(id,name) VALUES(?1,'Other synthetic')",[&other]).unwrap();assert_eq!(domain::dispatch(&f.root,"today.read",json!({"workspaceId":other,"today":"2026-11-06","timeZone":"UTC"})).unwrap()["tasks"]["count"],0);
 for input in [json!({"workspaceId":f.w,"today":"2026-02-30","timeZone":"UTC"}),json!({"workspaceId":f.w,"today":"2026-11-06","timeZone":"Made/Up"}),json!({"workspaceId":f.w,"today":"2026-11-06","timeZone":"UTC","weekStart":"2026-11-03"}),json!({"workspaceId":f.w,"today":"2026-11-06","timeZone":"UTC","weekStart":42}),json!({"workspaceId":"absent","today":"2026-11-06","timeZone":"UTC"})]{assert!(domain::dispatch(&f.root,"today.read",input).is_err());}
}
