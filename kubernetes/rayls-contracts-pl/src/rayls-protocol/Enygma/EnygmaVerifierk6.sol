// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract EnygmaVerifierk6 {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 20491192805390485299153009773594534940189261866228447918068658471970481763042;
    uint256 constant alphay  = 9383485363053290200918347156157836566562967994039712273449902621266178545958;
    uint256 constant betax1  = 4252822878758300859123897981450591353533073413197771768651442665752259397132;
    uint256 constant betax2  = 6375614351688725206403948262868962793625744043794305715222011528459656738731;
    uint256 constant betay1  = 21847035105528745403288232691147584728191162732299865338377159692350059136679;
    uint256 constant betay2  = 10505242626370262277552901082094356697409835680220590971873171140371331206856;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 6184333714103779392261821258006388325851865443552843443894385206729716912542;
    uint256 constant deltax2 = 7530853442438418937347387465290461298553723041257580757665552781781129532548;
    uint256 constant deltay1 = 16169542498441654193044740232552357111425123085111592680816549588675026561533;
    uint256 constant deltay2 = 1993057742118133626892415231794290180989325696581284693319400323940492687249;

    
    uint256 constant IC0x = 11646041060307382941282947642925148522751082650090122158395467723727328309266;
    uint256 constant IC0y = 9222800329060757607313593972144778117810082724731605616508920758258850645649;
    
    uint256 constant IC1x = 5505279061675381934098052906561607514360405478901629074607701687925278462024;
    uint256 constant IC1y = 19299522981099524581554573145262172403531153415259961122574141057029592049096;
    
    uint256 constant IC2x = 955173448631155542273509803858922744082281277737864875710740187334384303536;
    uint256 constant IC2y = 13826770133822295878428702583830591062954431340742568826123021337843476926217;
    
    uint256 constant IC3x = 8179412285600875200744737886121383936403705578463630686484853313924056806338;
    uint256 constant IC3y = 2780765198981341518493578366696271476559351789010190536540916163502192156747;
    
    uint256 constant IC4x = 5652459236900177661603905223162551178163321022025288823796856576346057439143;
    uint256 constant IC4y = 14198594756207096047630743444150284679708307287163624247685766217188292362261;
    
    uint256 constant IC5x = 20962712114883506344161481687027186953526419002754325978462296302577619084871;
    uint256 constant IC5y = 9464431658404284229499119942585819370853104811832658496135599140094091584143;
    
    uint256 constant IC6x = 14341315607828870783528735319759398661531674330234393090807446923581303376403;
    uint256 constant IC6y = 11538213142400894895235014248939914034994734474879826289632818912281415382369;
    
    uint256 constant IC7x = 20111318350561286995797645527457779818814573168651363732064715363921408243468;
    uint256 constant IC7y = 9212031997893132418810455971709739111154075025156046081588166527940748078462;
    
    uint256 constant IC8x = 5961611361223828929248934181326743574221167316800705484205963819048317928537;
    uint256 constant IC8y = 18451867519733315853761753949246192461341994495976017880904447149019485055494;
    
    uint256 constant IC9x = 4478188368912305012108330780375494830166526838551490977370223267013033301146;
    uint256 constant IC9y = 9635731090460602661796202685668473778682331683563552440975106882860867297638;
    
    uint256 constant IC10x = 3288700518110083686548713553449605376256398547459414438976933432928017843736;
    uint256 constant IC10y = 15720543222936146742414141055049727911053598051257172638924729676113954639291;
    
    uint256 constant IC11x = 7188542576741578324943862386361928344321341803638947652818627640107832194832;
    uint256 constant IC11y = 20730019746486174382538442275055681169823316266755259694636357550575418747601;
    
    uint256 constant IC12x = 19163552702560461211262890992323267384423312040201696429442777691137483544116;
    uint256 constant IC12y = 7595437647377870759051781935607776167300413315838320892148442710192219811036;
    
    uint256 constant IC13x = 7024330827657754101290587249399421749885644889671099822718010725973180665843;
    uint256 constant IC13y = 14427855064117903419078017107505725683495592891805280221612288246329891546329;
    
    uint256 constant IC14x = 3451871440875272575497388166869253132254964643706472012340195493409277733301;
    uint256 constant IC14y = 3596008495128058265516145694217002424551345042558266875291695071726354449000;
    
    uint256 constant IC15x = 16637414246236329873444657083852615226123186371702102827305441494018351159525;
    uint256 constant IC15y = 13143664072154820090783289997482390320198446500176676321327727679899815229370;
    
    uint256 constant IC16x = 18289145969595424369934397270427536484512439631481464813108829322021586221688;
    uint256 constant IC16y = 339413024749271553965901243127800489498209793303301844927345561278806846271;
    
    uint256 constant IC17x = 1483624669027178840503255199721161770134626280798935335542268118037625069180;
    uint256 constant IC17y = 8954159966057049090851373360818249851332496967626909232045285285168400764998;
    
    uint256 constant IC18x = 14333482176957818914461689742635347335996810032756573175422792636546087839514;
    uint256 constant IC18y = 16322975493502563052205261939936803320398057661280021999294480722225663197815;
    
    uint256 constant IC19x = 8649892629843997866902018182617662686875310425673526861743189818345286417642;
    uint256 constant IC19y = 4315411076343125091587799013154198127428586800349504372023729508792530933546;
    
    uint256 constant IC20x = 10799545341753000452997520826208612650655214454049743329396743724542298306409;
    uint256 constant IC20y = 12114697376343810314814382513327248653512610802604856488043295061451925982744;
    
    uint256 constant IC21x = 4552597319948687985756971773411365802269122852300528972491816466619941873473;
    uint256 constant IC21y = 14475586413886966540199879664555692637461606242793866436941329156446773724702;
    
    uint256 constant IC22x = 10782011320738040806774057757735125814707323025968758119365314458906317347775;
    uint256 constant IC22y = 20262940766059525528006014372243945117447217917812464614473196558084171161776;
    
    uint256 constant IC23x = 10257264843804557193356041648341347099304425614662945573110054293746802946077;
    uint256 constant IC23y = 18762662790182363576659543968658391696985398626370716984788466684230352398346;
    
    uint256 constant IC24x = 1784774740809937783155503050604689251395887404998294312195463617876402825707;
    uint256 constant IC24y = 5297045454436509513800072918294919119154532760771027249068534629145033471018;
    
    uint256 constant IC25x = 9893472073979413399912369135095744677255775455369752008035233247599119385059;
    uint256 constant IC25y = 19253773729715216809138046441607983920701568659528272175786054045978511607211;
    
    uint256 constant IC26x = 4289942674099647418770524727157334093524688344084278382606806256672987325288;
    uint256 constant IC26y = 2293591963681976594602955137439778600048152972172847448129359563086002192691;
    
    uint256 constant IC27x = 13810866796162093845731662481638075495647236833562536817483836183578961327855;
    uint256 constant IC27y = 15630655751011023348428062479325915666742611214617574760067271799786647426434;
    
    uint256 constant IC28x = 7665824085312997257475418789676392400856435888730612768291098970871007111726;
    uint256 constant IC28y = 17378275411785370905179800272258047354707397111279586704688655947204277179145;
    
    uint256 constant IC29x = 9324522931052619103983133573478042400713861542172279903361706232438816661898;
    uint256 constant IC29y = 14245664744840053091234910341199385033981540083185905377595448031963824915837;
    
    uint256 constant IC30x = 19534652558459328424938644873466415698454647548075032030476160064445433299178;
    uint256 constant IC30y = 5575302425554332765615968073340242787720179389183141365071248493657837127772;
    
    uint256 constant IC31x = 2291654884807360322173970800041866263294524683816170424976930592180618354122;
    uint256 constant IC31y = 18445225304409233162028174141244761784287521123029968848418144386095993347115;
    
    uint256 constant IC32x = 8955712631529724477620949896938502935634003368061702623012077724804592629969;
    uint256 constant IC32y = 7193815258393062951213135136835923906254512230481357467722769202163288920488;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[32] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                
                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))
                
                g1_mulAccC(_pVk, IC17x, IC17y, calldataload(add(pubSignals, 512)))
                
                g1_mulAccC(_pVk, IC18x, IC18y, calldataload(add(pubSignals, 544)))
                
                g1_mulAccC(_pVk, IC19x, IC19y, calldataload(add(pubSignals, 576)))
                
                g1_mulAccC(_pVk, IC20x, IC20y, calldataload(add(pubSignals, 608)))
                
                g1_mulAccC(_pVk, IC21x, IC21y, calldataload(add(pubSignals, 640)))
                
                g1_mulAccC(_pVk, IC22x, IC22y, calldataload(add(pubSignals, 672)))
                
                g1_mulAccC(_pVk, IC23x, IC23y, calldataload(add(pubSignals, 704)))
                
                g1_mulAccC(_pVk, IC24x, IC24y, calldataload(add(pubSignals, 736)))
                
                g1_mulAccC(_pVk, IC25x, IC25y, calldataload(add(pubSignals, 768)))
                
                g1_mulAccC(_pVk, IC26x, IC26y, calldataload(add(pubSignals, 800)))
                
                g1_mulAccC(_pVk, IC27x, IC27y, calldataload(add(pubSignals, 832)))
                
                g1_mulAccC(_pVk, IC28x, IC28y, calldataload(add(pubSignals, 864)))
                
                g1_mulAccC(_pVk, IC29x, IC29y, calldataload(add(pubSignals, 896)))
                
                g1_mulAccC(_pVk, IC30x, IC30y, calldataload(add(pubSignals, 928)))
                
                g1_mulAccC(_pVk, IC31x, IC31y, calldataload(add(pubSignals, 960)))
                
                g1_mulAccC(_pVk, IC32x, IC32y, calldataload(add(pubSignals, 992)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            
            checkField(calldataload(add(_pubSignals, 384)))
            
            checkField(calldataload(add(_pubSignals, 416)))
            
            checkField(calldataload(add(_pubSignals, 448)))
            
            checkField(calldataload(add(_pubSignals, 480)))
            
            checkField(calldataload(add(_pubSignals, 512)))
            
            checkField(calldataload(add(_pubSignals, 544)))
            
            checkField(calldataload(add(_pubSignals, 576)))
            
            checkField(calldataload(add(_pubSignals, 608)))
            
            checkField(calldataload(add(_pubSignals, 640)))
            
            checkField(calldataload(add(_pubSignals, 672)))
            
            checkField(calldataload(add(_pubSignals, 704)))
            
            checkField(calldataload(add(_pubSignals, 736)))
            
            checkField(calldataload(add(_pubSignals, 768)))
            
            checkField(calldataload(add(_pubSignals, 800)))
            
            checkField(calldataload(add(_pubSignals, 832)))
            
            checkField(calldataload(add(_pubSignals, 864)))
            
            checkField(calldataload(add(_pubSignals, 896)))
            
            checkField(calldataload(add(_pubSignals, 928)))
            
            checkField(calldataload(add(_pubSignals, 960)))
            
            checkField(calldataload(add(_pubSignals, 992)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
